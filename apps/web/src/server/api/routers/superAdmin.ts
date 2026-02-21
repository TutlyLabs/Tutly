import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  createSubdomainRecord,
  deleteRecord,
  verifyCustomDomain,
  getCnameTarget,
  getCustomDomainInstructions,
} from "@/lib/cloudflare";

/**
 * Middleware that ensures the user has SUPER_ADMIN role
 */
const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "SUPER_ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Super admin access required",
    });
  }
  return next({ ctx });
});

export const superAdminRouter = createTRPCRouter({
  // ─── Dashboard ───────────────────────────────────────────────
  dashboardStats: superAdminProcedure.query(async ({ ctx }) => {
    const [orgCount, userCount, activeDomainsCount, pendingOrgsCount] =
      await Promise.all([
        ctx.db.organization.count(),
        ctx.db.user.count(),
        ctx.db.organizationDomain.count({ where: { status: "ACTIVE" } }),
        ctx.db.organization.count({ where: { status: "PENDING" } }),
      ]);

    const recentOrgs = await ctx.db.organization.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { users: true } } },
    });

    return {
      orgCount,
      userCount,
      activeDomainsCount,
      pendingOrgsCount,
      recentOrgs,
    };
  }),

  // ─── Organizations ───────────────────────────────────────────
  listOrganizations: superAdminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        search: z.string().optional(),
        status: z
          .enum(["PENDING", "ACTIVE", "SUSPENDED", "ARCHIVED"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, status } = input;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { orgCode: { contains: search, mode: "insensitive" } },
          { subdomain: { contains: search, mode: "insensitive" } },
        ];
      }
      if (status) {
        where.status = status;
      }

      const [organizations, totalCount] = await Promise.all([
        ctx.db.organization.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            _count: { select: { users: true, domains: true } },
          },
        }),
        ctx.db.organization.count({ where }),
      ]);

      return {
        organizations,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      };
    }),

  getOrganization: superAdminProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({
        where: { id: input.orgId },
        include: {
          domains: { orderBy: { createdAt: "desc" } },
          _count: { select: { users: true } },
        },
      });

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      return org;
    }),

  createOrganization: superAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        orgCode: z.string().min(1),
        description: z.string().optional(),
        logo: z.string().optional(),
        website: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        subdomain: z.string().optional(),
        status: z
          .enum(["PENDING", "ACTIVE", "SUSPENDED", "ARCHIVED"])
          .default("PENDING"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check for unique constraints
      const existingOrg = await ctx.db.organization.findUnique({
        where: { orgCode: input.orgCode },
      });
      if (existingOrg) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Organization code already exists",
        });
      }

      if (input.subdomain) {
        const existingSubdomain = await ctx.db.organization.findUnique({
          where: { subdomain: input.subdomain },
        });
        if (existingSubdomain) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Subdomain already taken",
          });
        }
      }

      const org = await ctx.db.organization.create({
        data: {
          name: input.name,
          orgCode: input.orgCode.toUpperCase(),
          description: input.description,
          logo: input.logo,
          website: input.website,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          subdomain: input.subdomain?.toLowerCase(),
          status: input.status,
        },
      });

      return org;
    }),

  updateOrganization: superAdminProcedure
    .input(
      z.object({
        orgId: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        logo: z.string().optional(),
        website: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        status: z
          .enum(["PENDING", "ACTIVE", "SUSPENDED", "ARCHIVED"])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId, ...data } = input;

      const org = await ctx.db.organization.update({
        where: { id: orgId },
        data,
      });

      return org;
    }),

  // ─── Users ───────────────────────────────────────────────────
  listUsers: superAdminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        search: z.string().optional(),
        orgId: z.string().optional(),
        role: z
          .enum(["INSTRUCTOR", "MENTOR", "STUDENT", "ADMIN", "SUPER_ADMIN"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, orgId, role } = input;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { username: { contains: search, mode: "insensitive" } },
        ];
      }
      if (orgId) {
        where.organizationId = orgId;
      }
      if (role) {
        where.role = role;
      }

      const [users, totalCount] = await Promise.all([
        ctx.db.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            image: true,
            role: true,
            isAdmin: true,
            lastSeen: true,
            createdAt: true,
            banned: true,
            disabledAt: true,
            organization: {
              select: { id: true, name: true, orgCode: true },
            },
          },
        }),
        ctx.db.user.count({ where }),
      ]);

      return {
        users,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      };
    }),

  // ─── Domain Management ──────────────────────────────────────
  listDomains: superAdminProcedure
    .input(
      z.object({
        orgId: z.string().optional(),
        status: z
          .enum(["PENDING_VERIFICATION", "ACTIVE", "FAILED", "REMOVED"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input.orgId) where.organizationId = input.orgId;
      if (input.status) where.status = input.status;

      const domains = await ctx.db.organizationDomain.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          organization: {
            select: { id: true, name: true, orgCode: true },
          },
        },
      });

      return domains;
    }),

  provisionSubdomain: superAdminProcedure
    .input(
      z.object({
        orgId: z.string(),
        subdomain: z
          .string()
          .min(1)
          .max(63)
          .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
            message:
              "Subdomain must be lowercase alphanumeric with optional hyphens",
          }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const fullDomain = `${input.subdomain}.tutly.in`;

      // Check if subdomain is already taken
      const existing = await ctx.db.organizationDomain.findUnique({
        where: { domain: fullDomain },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Subdomain already provisioned",
        });
      }

      // Reserved subdomains
      const reserved = [
        "admin",
        "www",
        "api",
        "app",
        "mail",
        "ftp",
        "cname",
        "ns1",
        "ns2",
      ];
      if (reserved.includes(input.subdomain)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This subdomain is reserved",
        });
      }

      // Create DNS record via Cloudflare
      let cloudflareRecordId: string | null = null;
      try {
        const org = await ctx.db.organization.findUnique({
          where: { id: input.orgId },
          select: { name: true },
        });
        cloudflareRecordId = await createSubdomainRecord(
          input.subdomain,
          org?.name,
        );
      } catch (error) {
        console.error("Failed to create Cloudflare DNS record:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Failed to create DNS record. Check Cloudflare configuration.",
        });
      }

      // Save domain record and update org
      const [domain] = await ctx.db.$transaction([
        ctx.db.organizationDomain.create({
          data: {
            organizationId: input.orgId,
            domain: fullDomain,
            domainType: "SUBDOMAIN",
            status: "ACTIVE",
            cloudflareRecordId,
          },
        }),
        ctx.db.organization.update({
          where: { id: input.orgId },
          data: { subdomain: input.subdomain },
        }),
      ]);

      return domain;
    }),

  addCustomDomain: superAdminProcedure
    .input(
      z.object({
        orgId: z.string(),
        domain: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if domain is already taken
      const existing = await ctx.db.organizationDomain.findUnique({
        where: { domain: input.domain },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Domain already registered",
        });
      }

      const cnameTarget = getCnameTarget();
      const instructions = getCustomDomainInstructions(input.domain);

      const domain = await ctx.db.organizationDomain.create({
        data: {
          organizationId: input.orgId,
          domain: input.domain,
          domainType: "CUSTOM",
          status: "PENDING_VERIFICATION",
          cnameTarget,
        },
      });

      return { domain, instructions };
    }),

  verifyDomain: superAdminProcedure
    .input(z.object({ domainId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const domain = await ctx.db.organizationDomain.findUnique({
        where: { id: input.domainId },
      });

      if (!domain) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found" });
      }

      if (domain.domainType !== "CUSTOM") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only custom domains need verification",
        });
      }

      const isVerified = await verifyCustomDomain(domain.domain);

      if (isVerified) {
        const updated = await ctx.db.$transaction([
          ctx.db.organizationDomain.update({
            where: { id: input.domainId },
            data: { status: "ACTIVE", verifiedAt: new Date() },
          }),
          ctx.db.organization.update({
            where: { id: domain.organizationId },
            data: { customDomain: domain.domain },
          }),
        ]);

        return { verified: true, domain: updated[0] };
      }

      return { verified: false, domain };
    }),

  removeDomain: superAdminProcedure
    .input(z.object({ domainId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const domain = await ctx.db.organizationDomain.findUnique({
        where: { id: input.domainId },
      });

      if (!domain) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found" });
      }

      // Remove Cloudflare DNS record if exists
      if (domain.cloudflareRecordId) {
        try {
          await deleteRecord(domain.cloudflareRecordId);
        } catch (error) {
          console.error("Failed to delete Cloudflare DNS record:", error);
        }
      }

      // Update org fields and delete domain record
      await ctx.db.$transaction([
        ctx.db.organizationDomain.delete({
          where: { id: input.domainId },
        }),
        ctx.db.organization.update({
          where: { id: domain.organizationId },
          data: {
            ...(domain.domainType === "SUBDOMAIN"
              ? { subdomain: null }
              : { customDomain: null }),
          },
        }),
      ]);

      return { success: true };
    }),
});
