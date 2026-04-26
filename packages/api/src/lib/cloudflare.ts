/**
 * Cloudflare DNS Management Utility
 *
 * Used by the super admin panel to provision subdomains (A records)
 * and manage custom domains (CNAME verification).
 */

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || "";
const APP_SERVER_IP = process.env.APP_SERVER_IP || "";

const CF_API_BASE = "https://api.cloudflare.com/client/v4";

interface CloudflareResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
}

interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
}

async function cfFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<CloudflareResponse<T>> {
  const res = await fetch(`${CF_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = (await res.json()) as CloudflareResponse<T>;

  if (!data.success) {
    const errorMsg =
      data.errors?.map((e) => e.message).join(", ") ||
      "Unknown Cloudflare API error";
    throw new Error(`Cloudflare API error: ${errorMsg}`);
  }

  return data;
}

export async function createSubdomainRecord(
  subdomain: string,
  orgName?: string,
): Promise<string> {
  if (!APP_SERVER_IP) {
    throw new Error("APP_SERVER_IP environment variable is not set");
  }

  const comment = orgName
    ? `Tutly subdomain for ${orgName} org [managed by super-admin]`
    : `Tutly subdomain [managed by super-admin]`;

  const data = await cfFetch<DnsRecord>(
    `/zones/${CLOUDFLARE_ZONE_ID}/dns_records`,
    {
      method: "POST",
      body: JSON.stringify({
        type: "A",
        name: `${subdomain}.tutly.in`,
        content: APP_SERVER_IP,
        proxied: true, // Let Cloudflare handle the SSL certificate!
        ttl: 1,
        comment,
      }),
    },
  );

  return data.result.id;
}

export async function ensureCnameTarget(): Promise<void> {
  const cnameTarget = "cname.tutly.in";

  // Check if cname target already exists
  const existing = await cfFetch<DnsRecord[]>(
    `/zones/${CLOUDFLARE_ZONE_ID}/dns_records?type=A&name=${cnameTarget}`,
  );

  if (existing.result.length > 0) {
    return; // Already exists
  }

  await cfFetch<DnsRecord>(`/zones/${CLOUDFLARE_ZONE_ID}/dns_records`, {
    method: "POST",
    body: JSON.stringify({
      type: "A",
      name: cnameTarget,
      content: APP_SERVER_IP,
      proxied: false, // DNS only — Traefik handles TLS
      ttl: 1,
      comment: `Tutly CNAME target for custom domains [managed by super-admin]`,
    }),
  });
}

export async function deleteRecord(recordId: string): Promise<void> {
  await cfFetch<{ id: string }>(
    `/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${recordId}`,
    { method: "DELETE" },
  );
}

export async function verifyCustomDomain(domain: string): Promise<boolean> {
  try {
    // Use Cloudflare's DNS-over-HTTPS to check CNAME resolution
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=CNAME`,
      {
        headers: { Accept: "application/dns-json" },
      },
    );

    const data = (await res.json()) as {
      Answer?: Array<{ data: string }>;
    };

    const cnameTarget = "cname.tutly.in";

    if (data.Answer) {
      return data.Answer.some(
        (record) =>
          record.data.replace(/\.$/, "").toLowerCase() ===
          cnameTarget.toLowerCase(),
      );
    }

    return false;
  } catch {
    return false;
  }
}

export function getCnameTarget(): string {
  return "cname.tutly.in";
}

export function getCustomDomainInstructions(customDomain: string) {
  const parts = customDomain.split(".");
  const hostname = parts[0] || customDomain;

  return {
    type: "CNAME" as const,
    name: hostname,
    value: getCnameTarget(),
    instructions: `Add a CNAME record in your DNS provider:\n\nType: CNAME\nName: ${hostname}\nValue: ${getCnameTarget()}\nTTL: Auto or 3600`,
  };
}
