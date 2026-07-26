import { randomInt } from "crypto";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import type { Role } from "@tutly/db/browser";

import {
  requireCourseReadAccess,
  requireUserInOrganization,
} from "../lib/authorization";
import {
  createTRPCRouter,
  mentorProcedure,
  protectedProcedure,
  publicProcedure,
  staffProcedure,
} from "../trpc";

/** Roles a caller may hand out. Only a SUPER_ADMIN can mint admin-tier accounts. */
const assignableRoleSchema = z.enum([
  "STUDENT",
  "MENTOR",
  "INSTRUCTOR",
  "ADMIN",
  "SUPER_ADMIN",
]);

function assertCanAssignRole(actorRole: string, requested: string) {
  if (
    (requested === "ADMIN" || requested === "SUPER_ADMIN") &&
    actorRole !== "SUPER_ADMIN"
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot assign this role",
    });
  }
}

export const generateRandomPassword = (length = 8) => {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  let password = "";
  password += lowercase[randomInt(lowercase.length)];
  password += uppercase[randomInt(uppercase.length)];
  password += numbers[randomInt(numbers.length)];
  password += symbols[randomInt(symbols.length)];

  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = password.length; i < length; i++) {
    password += allChars[randomInt(allChars.length)];
  }

  const arr = password.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.join("");
};

// Safe user schema - only expose non-sensitive fields
const safeUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  role: z.string(),
  image: z.string().nullable(),
  mobile: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  isEmailVerified: z.boolean(),
  isProfilePublic: z.boolean(),
});

export const usersRouter = createTRPCRouter({
  hasCredentialAccount: protectedProcedure.query(async ({ ctx }) => {
    const account = await ctx.db.account.findFirst({
      where: { userId: ctx.session.user.id, providerId: "credential" },
      select: { id: true },
    });
    return Boolean(account);
  }),

  // Returns every student's email in the course, so it is mentor-and-above only.
  getAllEnrolledUsers: mentorProcedure
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (!currentUser.organization) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization not found",
        });
      }
      await requireCourseReadAccess(ctx, input.courseId);
      const enrolledUsers = await ctx.db.user.findMany({
        where: {
          role: "STUDENT",
          organizationId: currentUser.organization.id,
          enrolledUsers: {
            some: {
              courseId: input.courseId,
            },
          },
        },
        select: {
          id: true,
          image: true,
          username: true,
          name: true,
          email: true,
        },
      });

      return enrolledUsers;
    }),

  updateUserProfile: protectedProcedure
    .input(
      z.object({
        profile: z
          .object({
            mobile: z.string(),
            whatsapp: z.string(),
            gender: z.string(),
            tshirtSize: z.string(),
            secondaryEmail: z.string(),
            dateOfBirth: z
              .union([z.date(), z.string()])
              .transform((val) =>
                typeof val === "string" ? new Date(val) : val,
              )
              .nullable(),
            hobbies: z.array(z.string()),
            aboutMe: z.string(),
            socialLinks: z.record(z.string(), z.string()),
            professionalProfiles: z.record(z.string(), z.string()),
            academicDetails: z.record(z.string(), z.string()),
            experiences: z.array(z.record(z.string(), z.any())),
            address: z.record(z.string(), z.string()),
            documents: z.record(z.string(), z.string()),
            metadata: z.record(z.string(), z.any()),
          })
          .partial(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      const defaultValues = {
        userId: currentUser.id,
        mobile: null,
        whatsapp: null,
        gender: null,
        tshirtSize: null,
        secondaryEmail: null,
        dateOfBirth: null,
        hobbies: [],
        aboutMe: null,
        socialLinks: {},
        professionalProfiles: {},
        academicDetails: {},
        experiences: [],
        address: {},
        documents: {},
      };

      const createData = {
        ...defaultValues,
        ...Object.fromEntries(
          Object.entries(input.profile).map(([key, value]) => [
            key,
            value ?? defaultValues[key as keyof typeof defaultValues],
          ]),
        ),
      };

      const updateData = Object.fromEntries(
        Object.entries(input.profile).map(([key, value]) => [key, value]),
      );

      const updatedProfile = await ctx.db.profile.upsert({
        where: { userId: currentUser.id },
        create: createData,
        update: updateData,
      });

      return updatedProfile;
    }),

  updateUserAvatar: protectedProcedure
    .input(
      z.object({
        avatar: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      const updatedProfile = await ctx.db.user.update({
        where: { id: currentUser.id },
        data: { image: input.avatar },
      });

      return updatedProfile;
    }),

  createUser: staffProcedure
    .input(
      z.object({
        name: z.string(),
        username: z.string(),
        email: z.string(),
        password: z.string(),
        role: assignableRoleSchema,
      }),
    )
    .output(safeUserSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanAssignRole(ctx.session.user.role, input.role);
      if (!ctx.session.user.organization) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Organization not found",
        });
      }

      const existingUser = await ctx.db.user.findUnique({
        where: { username: input.username },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That username is already taken",
        });
      }

      return await ctx.db.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            name: input.name,
            username: input.username,
            email: input.email,
            role: input.role as Role,
            organization: {
              connect: { id: ctx.session.user.organization?.id },
            },
            oneTimePassword: generateRandomPassword(8),
          },
        });

        const hashedPassword = await bcrypt.hash(input.password, 10);

        await tx.account.create({
          data: {
            accountId: createdUser.id,
            userId: createdUser.id,
            providerId: "credential",
            password: hashedPassword,
          },
        });

        return createdUser;
      });
    }),

  updateUser: staffProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        username: z.string(),
        email: z.string(),
        role: assignableRoleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCanAssignRole(ctx.session.user.role, input.role);
      await requireUserInOrganization(ctx, input.id);

      return await ctx.db.user.update({
        where: { id: input.id },
        data: {
          name: input.name,
          username: input.username,
          email: input.email,
          role: input.role as Role,
        },
      });
    }),

  deleteUser: staffProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireUserInOrganization(ctx, input.id);

      await ctx.db.user.delete({ where: { id: input.id } });
    }),

  bulkUpsert: staffProcedure
    .input(
      z.array(
        z.object({
          name: z.string(),
          username: z.string(),
          email: z.string(),
          password: z.string().optional(),
          role: assignableRoleSchema,
        }),
      ),
    )
    .output(z.array(safeUserSchema))
    .mutation(async ({ ctx, input }) => {
      for (const row of input) {
        assertCanAssignRole(ctx.session.user.role, row.role);
      }
      if (!ctx.session.user.organization) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Organization not found",
        });
      }

      return await Promise.all(
        input.map(async (userData) => {
          const existingUser = await ctx.db.user.findFirst({
            where: {
              email: userData.email,
              organizationId: ctx.session.user.organization?.id,
            },
          });

          const hashedPassword =
            "password" in userData && userData.password
              ? await bcrypt.hash(userData.password, 10)
              : null;

          if (existingUser) {
            return ctx.db.$transaction(async (tx) => {
              const updatedUser = await tx.user.update({
                where: { id: existingUser.id },
                data: {
                  name: userData.name,
                  username: userData.username,
                  role: userData.role as Role,
                },
              });
              if (hashedPassword) {
                await tx.account.updateMany({
                  where: {
                    userId: existingUser.id,
                    providerId: "credential",
                  },
                  data: { password: hashedPassword },
                });
              }
              return updatedUser;
            });
          }

          // For new users, check if username already exists
          const usernameExists = await ctx.db.user.findUnique({
            where: { username: userData.username },
          });

          if (usernameExists) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "One or more usernames are already taken",
            });
          }

          return ctx.db.$transaction(async (tx) => {
            const createdUser = await tx.user.create({
              data: {
                name: userData.name,
                username: userData.username,
                email: userData.email,
                organization: {
                  connect: { id: ctx.session.user.organization?.id },
                },
                role: userData.role as Role,
                oneTimePassword: generateRandomPassword(8),
              },
            });

            if (hashedPassword) {
              await tx.account.create({
                data: {
                  accountId: createdUser.id,
                  userId: createdUser.id,
                  providerId: "credential",
                  password: hashedPassword,
                },
              });
            }
            return createdUser;
          });
        }),
      );
    }),

  instructor_resetPassword: staffProcedure
    .input(
      z.object({
        email: z.string(),
        newPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Cross-tenant password reset was previously possible for any instructor.
      await requireUserInOrganization(ctx, user.id);

      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      const existingAccountForInstructorReset = await ctx.db.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      });

      if (existingAccountForInstructorReset) {
        await ctx.db.account.update({
          where: { id: existingAccountForInstructorReset.id },
          data: { password: hashedPassword },
        });
      } else {
        await ctx.db.account.create({
          data: {
            accountId: user.id,
            userId: user.id,
            providerId: "credential",
            password: hashedPassword,
          },
        });
      }

      return { message: "Password reset successfully" };
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        oldPassword: z.string().optional(),
        password: z.string().min(8),
        confirmPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      if (input.password !== input.confirmPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Passwords do not match",
        });
      }

      const account = await ctx.db.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      });

      // Whether the old password is required is decided from stored state, never
      // from the client: omitting it must not skip verification.
      if (account?.password) {
        if (!input.oldPassword) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Current password is required",
          });
        }
        const isOldPasswordCorrect = await bcrypt.compare(
          input.oldPassword,
          account.password,
        );
        if (!isOldPasswordCorrect) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Current password is incorrect",
          });
        }
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      if (account) {
        await ctx.db.account.update({
          where: { id: account.id },
          data: { password: hashedPassword },
        });
      } else {
        await ctx.db.account.create({
          data: {
            accountId: user.id,
            userId: user.id,
            providerId: "credential",
            password: hashedPassword,
          },
        });
      }

      await ctx.db.session.deleteMany({
        where: {
          userId: user.id,
        },
      });

      return { message: "Password changed successfully" };
    }),

  getUserProfile: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    const userProfile = await ctx.db.user.findUnique({
      where: {
        id: currentUser.id,
      },
      include: {
        profile: true,
      },
    });

    return userProfile;
  }),

  checkUserPassword: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    const credentialAccount = await ctx.db.account.findFirst({
      where: {
        userId: currentUser.id,
        providerId: "credential",
      },
      select: {
        password: true,
      },
    });

    return {
      isPasswordExists:
        credentialAccount !== null && credentialAccount.password !== null,
      email: currentUser.email,
    };
  }),

  getUserSessions: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    // Narrow selects: the full rows carry session bearer tokens, password
    // hashes and provider access tokens, none of which the UI needs.
    const sessions = await ctx.db.session.findMany({
      where: { userId: currentUser.id },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const accounts = await ctx.db.account.findMany({
      where: { userId: currentUser.id },
      select: { id: true, providerId: true, accountId: true, createdAt: true },
    });

    return {
      sessions,
      accounts,
      currentSessionId: ctx.session.session?.id ?? null,
    };
  }),

  deleteSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      const session = await ctx.db.session.findFirst({
        where: {
          id: input.sessionId,
          userId: currentUser.id,
        },
        select: { id: true },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      await ctx.db.session.delete({
        where: { id: input.sessionId },
      });
    }),

  getTutorActivityData: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        filter: z.array(z.string()).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      const { search, filter, page, limit } = input;

      if (currentUser.role !== "INSTRUCTOR" && currentUser.role !== "MENTOR") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this data",
        });
      }

      const searchTerm = search ?? "";
      const filters = filter ?? [];
      const onlineCutoff = new Date(Date.now() - 2 * 60 * 1000);

      const activeFilters = filters
        .map((f) => {
          const [column, operator, value] = f.split(":");
          return { column, operator, value };
        })
        .filter((f) => f.column && f.operator && f.value);

      const enrolledCourses = await ctx.db.enrolledUsers.findMany({
        where: {
          username: currentUser.username,
          courseId: {
            not: null,
          },
        },
        select: {
          courseId: true,
        },
      });

      const courseIds = enrolledCourses
        .map((enrolled) => enrolled.courseId)
        .filter(Boolean);
      const uniqueCourseIds = [...new Set(courseIds)];

      const where: Record<string, any> = {
        courseId: {
          in: uniqueCourseIds,
        },
        user: {
          role: {
            in: ["STUDENT", "MENTOR"],
          },
          organizationId: currentUser.organizationId,
        },
      };

      if (currentUser.role === "MENTOR") {
        where.mentorUsername = currentUser.username;
      }

      if (searchTerm) {
        where.user.OR = [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { username: { contains: searchTerm, mode: "insensitive" } },
          { email: { contains: searchTerm, mode: "insensitive" } },
        ];
      }

      const parseHours = (raw: string | undefined) => {
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n : null;
      };

      activeFilters.forEach((filter) => {
        const { column, operator, value } = filter;

        if (typeof column === "string") {
          switch (operator) {
            case "contains":
              where.user[column] = { contains: value, mode: "insensitive" };
              break;
            case "equals":
              where.user[column] = value;
              break;
            case "online":
              where.user.lastSeen = { gte: onlineCutoff };
              break;
            case "seen_within_hours": {
              const hours = parseHours(value);
              if (hours)
                where.user.lastSeen = {
                  gte: new Date(Date.now() - hours * 60 * 60 * 1000),
                };
              break;
            }
            case "seen_before_hours": {
              const hours = parseHours(value);
              if (hours)
                where.user.lastSeen = {
                  lt: new Date(Date.now() - hours * 60 * 60 * 1000),
                };
              break;
            }
            case "never_seen":
              where.user.lastSeen = null;
              break;
          }
        }
      });

      const now = Date.now();
      const h = (n: number) => new Date(now - n * 60 * 60 * 1000);
      const [
        totalItems,
        activeCount,
        neverSeenCount,
        last1hCount,
        last24hCount,
        last7dCount,
      ] = await Promise.all([
        ctx.db.enrolledUsers.count({ where }),
        ctx.db.enrolledUsers.count({
          where: {
            ...where,
            user: { ...where.user, lastSeen: { gte: onlineCutoff } },
          },
        }),
        ctx.db.enrolledUsers.count({
          where: { ...where, user: { ...where.user, lastSeen: null } },
        }),
        ctx.db.enrolledUsers.count({
          where: {
            ...where,
            user: { ...where.user, lastSeen: { gte: h(1) } },
          },
        }),
        ctx.db.enrolledUsers.count({
          where: {
            ...where,
            user: { ...where.user, lastSeen: { gte: h(24) } },
          },
        }),
        ctx.db.enrolledUsers.count({
          where: {
            ...where,
            user: { ...where.user, lastSeen: { gte: h(24 * 7) } },
          },
        }),
      ]);

      const enrolledUsers = await ctx.db.enrolledUsers.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              mobile: true,
              image: true,
              role: true,
              lastSeen: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        orderBy: [
          {
            user: {
              lastSeen: {
                sort: "desc",
                nulls: "last",
              },
            },
          },
        ],
        skip: (page - 1) * limit,
        take: limit,
        distinct: ["username"],
      });

      const users = enrolledUsers.map((enrolled) => ({
        ...enrolled.user,
        courseId: enrolled.courseId,
        mentorUsername: enrolled.mentorUsername,
      }));

      return {
        users,
        totalItems,
        activeCount,
        neverSeenCount,
        last1hCount,
        last24hCount,
        last7dCount,
      };
    }),

  getTutorManageUsersData: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        sort: z.string().default("name"),
        direction: z.string().default("asc"),
        filter: z.array(z.string()).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      const { search, sort, direction, filter, page, limit } = input;

      if (currentUser.role !== "INSTRUCTOR" && currentUser.role !== "MENTOR") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this data",
        });
      }

      const searchTerm = search ?? "";
      const sortField = sort || "name";
      const sortDirection = direction || "asc";
      const filters = filter ?? [];
      const activeFilters = filters
        .map((f) => {
          const [column, operator, value] = f.split(":");
          return { column, operator, value };
        })
        .filter((f) => f.column && f.operator && f.value);

      const courses = await ctx.db.course.findMany({
        where:
          currentUser.role === "INSTRUCTOR"
            ? {
                enrolledUsers: {
                  some: {
                    username: currentUser.username,
                  },
                },
              }
            : {
                enrolledUsers: {
                  some: {
                    mentorUsername: currentUser.username,
                  },
                },
              },
        select: {
          id: true,
        },
      });

      const courseIds = courses.map((course) => course.id);

      let allUsers;
      let totalItems;

      if (currentUser.role === "INSTRUCTOR") {
        // For instructors: show all users in organization (enrolled or not)
        const userWhere: Record<string, any> = {
          role: {
            in: ["STUDENT", "MENTOR"],
          },
          organizationId: currentUser.organizationId,
        };

        if (searchTerm) {
          userWhere.OR = [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { username: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
          ];
        }

        // Apply custom filters
        activeFilters.forEach((filter) => {
          const { column, operator, value } = filter;

          if (typeof column === "string") {
            switch (operator) {
              case "contains":
                userWhere[column] = {
                  contains: value,
                  mode: "insensitive",
                };
                break;
              case "equals":
                userWhere[column] = value;
                break;
              case "startsWith":
                userWhere[column] = { startsWith: value, mode: "insensitive" };
                break;
              case "endsWith":
                userWhere[column] = { endsWith: value, mode: "insensitive" };
                break;
              case "greaterThan":
                userWhere[column] = { gt: Number(value) };
                break;
              case "lessThan":
                userWhere[column] = { lt: Number(value) };
                break;
            }
          }
        });

        totalItems = await ctx.db.user.count({ where: userWhere });

        const allOrgUsers = await ctx.db.user.findMany({
          where: userWhere,
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            disabledAt: true,
          },
          orderBy: {
            [sortField]: sortDirection,
          },
          skip: (page - 1) * limit,
          take: limit,
        });

        // Get enrollment info for these users (to show which course/mentor they're assigned to)
        const enrollmentMap = await ctx.db.enrolledUsers.findMany({
          where: {
            username: {
              in: allOrgUsers.map((u) => u.username),
            },
            courseId: {
              in: courseIds,
            },
          },
          select: {
            username: true,
            courseId: true,
            mentorUsername: true,
          },
        });

        const enrollmentsByUsername = new Map(
          enrollmentMap.map((e) => [e.username, e]),
        );

        allUsers = allOrgUsers.map((user) => {
          const enrollment = enrollmentsByUsername.get(user.username);
          return {
            ...user,
            courseId: enrollment?.courseId ?? null,
            mentorUsername: enrollment?.mentorUsername ?? null,
          };
        });
      } else {
        // For mentors: show only their assigned mentees
        const mentorWhere: Record<string, any> = {
          mentorUsername: currentUser.username,
        };

        if (searchTerm) {
          mentorWhere.user = {
            OR: [
              { name: { contains: searchTerm, mode: "insensitive" } },
              { username: { contains: searchTerm, mode: "insensitive" } },
              { email: { contains: searchTerm, mode: "insensitive" } },
            ],
          };
        }

        activeFilters.forEach((filter) => {
          const { column, operator, value } = filter;

          if (typeof column === "string") {
            if (!mentorWhere.user) mentorWhere.user = {};
            switch (operator) {
              case "contains":
                mentorWhere.user[column] = {
                  contains: value,
                  mode: "insensitive",
                };
                break;
              case "equals":
                mentorWhere.user[column] = value;
                break;
              case "startsWith":
                mentorWhere.user[column] = {
                  startsWith: value,
                  mode: "insensitive",
                };
                break;
              case "endsWith":
                mentorWhere.user[column] = {
                  endsWith: value,
                  mode: "insensitive",
                };
                break;
              case "greaterThan":
                mentorWhere.user[column] = { gt: Number(value) };
                break;
              case "lessThan":
                mentorWhere.user[column] = { lt: Number(value) };
                break;
            }
          }
        });

        totalItems = await ctx.db.enrolledUsers.count({ where: mentorWhere });

        const mentorEnrolledUsers = await ctx.db.enrolledUsers.findMany({
          where: mentorWhere,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                role: true,
                disabledAt: true,
              },
            },
          },
          orderBy: {
            user: {
              [sortField]: sortDirection,
            },
          },
          skip: (page - 1) * limit,
          take: limit,
          distinct: ["username"],
        });

        allUsers = mentorEnrolledUsers.map((enrolled) => ({
          ...enrolled.user,
          courseId: enrolled.courseId,
          mentorUsername: enrolled.mentorUsername,
        }));
      }

      return {
        users: allUsers,
        totalItems,
        userRole: currentUser.role,
        isAdmin: currentUser.isAdmin,
      };
    }),

  /**
   * Genuinely public: `/u/[username]` is a signed-out page. Gated on the user's
   * own `isProfilePublic` opt-in, and the selection carries no email, mobile or
   * oneTimePassword.
   */
  getPublicProfile: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { username: input.username },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          role: true,
          isProfilePublic: true,
          createdAt: true,
          profile: {
            select: {
              headline: true,
              skills: true,
              aboutMe: true,
              hobbies: true,
              socialLinks: true,
              professionalProfiles: true,
              academicDetails: true,
              experiences: true,
              dateOfBirth: true,
              gender: true,
              address: true,
              metadata: true,
            },
          },
          enrolledUsers: {
            select: {
              course: { select: { id: true, title: true, image: true } },
              startDate: true,
            },
            take: 10,
          },
        },
      });

      if (!user) return null;
      // No id here: a private profile must not hand out an internal user id.
      if (!user.isProfilePublic) return { isPrivate: true as const };

      // For instructors/mentors also fetch courses they teach/mentor + stats
      let taughtCourses: Array<{
        id: string;
        title: string;
        image: string | null;
      }> = [];
      let instructorStats: {
        totalStudents: number;
        totalCourses: number;
        totalAssignments: number;
      } | null = null;
      if (user.role === "INSTRUCTOR" || user.role === "MENTOR") {
        const courses = await ctx.db.course.findMany({
          where: { createdById: user.id },
          select: { id: true, title: true, image: true },
        });
        taughtCourses = courses.slice(0, 10);
        const courseIds = courses.map((c) => c.id);
        const [studentCount, assignmentCount] = await Promise.all([
          courseIds.length > 0
            ? ctx.db.enrolledUsers.count({
                where: { courseId: { in: courseIds } },
              })
            : Promise.resolve(0),
          courseIds.length > 0
            ? ctx.db.attachment.count({
                where: { courseId: { in: courseIds } },
              })
            : Promise.resolve(0),
        ]);
        instructorStats = {
          totalStudents: studentCount,
          totalCourses: courses.length,
          totalAssignments: assignmentCount,
        };
      }

      // Compute stats for students
      let stats: {
        totalPoints: number;
        totalSubmissions: number;
        assignmentsEvaluated: number;
        attendancePercentage: number | null;
      } | null = null;
      const activityCounts: Record<string, number> = {};
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 364);
      oneYearAgo.setHours(0, 0, 0, 0);

      if (user.role === "STUDENT") {
        const [submissions, attendance] = await Promise.all([
          ctx.db.submission.findMany({
            where: { enrolledUser: { username: user.username } },
            include: { points: { select: { score: true } } },
          }),
          ctx.db.attendance.findMany({
            where: { username: user.username },
            select: { attended: true },
          }),
        ]);
        const totalPoints = submissions.reduce(
          (acc, s) => acc + s.points.reduce((a, p) => a + (p.score ?? 0), 0),
          0,
        );
        const evaluatedCount = submissions.filter(
          (s) => s.points.length > 0,
        ).length;
        const attendancePercentage =
          attendance.length > 0
            ? Math.round(
                (attendance.filter((a) => a.attended).length /
                  attendance.length) *
                  100,
              )
            : null;
        stats = {
          totalPoints,
          totalSubmissions: submissions.length,
          assignmentsEvaluated: evaluatedCount,
          attendancePercentage,
        };

        for (const s of submissions) {
          const d = s.submissionDate ?? s.createdAt;
          if (d && d >= oneYearAgo) {
            const key = d.toISOString().slice(0, 10);
            activityCounts[key] = (activityCounts[key] ?? 0) + 1;
          }
        }
      } else if (user.role === "INSTRUCTOR" || user.role === "MENTOR") {
        const points = await ctx.db.point.findMany({
          where: {
            createdAt: { gte: oneYearAgo },
            submissions: {
              enrolledUser: {
                course: { createdById: user.id },
              },
            },
          },
          select: { createdAt: true },
        });
        for (const p of points) {
          const key = p.createdAt.toISOString().slice(0, 10);
          activityCounts[key] = (activityCounts[key] ?? 0) + 1;
        }
      }

      const activityHeatmap = Object.entries(activityCounts).map(
        ([date, count]) => ({ date, count }),
      );

      return {
        ...user,
        taughtCourses,
        stats,
        instructorStats,
        activityHeatmap,
      };
    }),

  // Toggle profile visibility
  setProfilePublic: protectedProcedure
    .input(z.object({ isPublic: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { isProfilePublic: input.isPublic },
        select: { isProfilePublic: true },
      });
    }),

  // Update headline + skills (profile extended fields)
  updateProfileExtended: protectedProcedure
    .input(
      z.object({
        headline: z.string().max(120).optional(),
        skills: z.array(z.string()).max(30).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.profile.upsert({
        where: { userId },
        create: { userId, ...input },
        update: input,
      });
    }),

  disableUser: staffProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input: { id } }) => {
      await requireUserInOrganization(ctx, id);

      const user = await ctx.db.user.findUnique({
        where: { id },
        select: { disabledAt: true },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (user.disabledAt) {
        const updatedUser = await ctx.db.user.update({
          where: { id },
          data: { disabledAt: null },
        });
        return {
          message: "User enabled successfully",
          user: updatedUser,
          action: "enabled" as const,
        };
      }

      await ctx.db.session.deleteMany({
        where: { userId: id },
      });

      const updatedUser = await ctx.db.user.update({
        where: { id },
        data: { disabledAt: new Date() },
      });

      return {
        message: "User disabled successfully",
        user: updatedUser,
        action: "disabled" as const,
      };
    }),
});
