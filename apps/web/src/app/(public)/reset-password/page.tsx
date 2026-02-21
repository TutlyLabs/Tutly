import ManagePassword from "@/app/(protected)/profile/_components/ManagePassword";
import { getAuthDomainUrl, getBaseDomain } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;

  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") || headersList.get("host") || "";
  const baseDomain = await getBaseDomain();
  const authDomainPrefix = `auth.${baseDomain.split(":")[0]}`;

  if (!host.startsWith(authDomainPrefix)) {
    const params = new URLSearchParams();
    if (email) params.set("email", email);
    if (token) params.set("token", token);
    const qs = params.toString();
    redirect(await getAuthDomainUrl(`/reset-password${qs ? `?${qs}` : ""}`));
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <ManagePassword initialEmail={email} token={token} />
    </div>
  );
}
