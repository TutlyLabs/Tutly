import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { cache } from "react";

export type DomainStatus =
  | { status: "system" }
  | {
      status: "tenant";
      org: NonNullable<Awaited<ReturnType<typeof db.organization.findFirst>>>;
    }
  | { status: "invalid" };

export const getOrgFromHost = cache(async (): Promise<DomainStatus> => {
  const headersList = await headers();
  const host = headersList.get("host");

  if (!host) return { status: "system" };

  // Remove port
  const hostname = host.split(":")[0]!;

  let subdomain: string | null = null;
  let isSystemHost = false;

  // Dynamically determine the base domain from the host or environment
  const baseDomain =
    process.env.NODE_ENV === "production" ? "tutly.in" : "localhost";

  if (hostname === baseDomain) {
    isSystemHost = true;
  } else if (hostname.endsWith(`.${baseDomain}`)) {
    subdomain = hostname.replace(`.${baseDomain}`, "");
  }

  // Let the main domain and system subdomains pass
  if (
    isSystemHost ||
    (subdomain && ["learn", "api", "auth", "admin"].includes(subdomain))
  ) {
    return { status: "system" }; // System host, no specific org
  }

  // Tenant subdomain
  if (subdomain) {
    const org = await db.organization.findFirst({
      where: {
        subdomain,
        status: { notIn: ["ARCHIVED", "SUSPENDED"] },
      },
      select: {
        id: true,
        name: true,
        logo: true,
        subdomain: true,
        customDomain: true,
      },
    });
    return org ? { status: "tenant", org: org as any } : { status: "invalid" };
  }

  // Custom domain
  const orgDomain = await db.organizationDomain.findFirst({
    where: {
      domain: host,
      status: { notIn: ["FAILED", "REMOVED"] },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          logo: true,
          subdomain: true,
          customDomain: true,
          status: true,
        },
      },
    },
  });

  return orgDomain?.organization &&
    !["ARCHIVED", "SUSPENDED"].includes(orgDomain.organization.status)
    ? { status: "tenant", org: orgDomain.organization as any }
    : { status: "invalid" };
});
