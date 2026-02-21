import { getOrgFromHost } from "@/lib/domain";
import { SignIn } from "../_components/Signin";
import { getAuthDomainUrl, getBaseDomain, getProtocol } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") || headersList.get("host") || "";
  const baseDomain = await getBaseDomain();
  const authDomainPrefix = `auth.${baseDomain.split(":")[0]}`;

  if (!host.startsWith(authDomainPrefix)) {
    redirect(await getAuthDomainUrl("/sign-in"));
  }

  const domainData = await getOrgFromHost();
  const org = domainData.status === "tenant" ? domainData.org : null;
  return <SignIn orgName={org?.name} orgLogo={org?.logo} />;
}
