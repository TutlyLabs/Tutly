"use server";

import {
  getServerSession,
  getPostLoginRedirectUrl,
  getAuthDomainUrl,
  getSyncRedirectUrl,
} from "@/lib/auth";

export async function loginRedirectAction(token?: string, userPayload?: any) {
  const session = await getServerSession();

  const user = session?.user || userPayload;

  if (!user) {
    return await getAuthDomainUrl("/sign-in");
  }

  const url = await getPostLoginRedirectUrl(user);
  return await getSyncRedirectUrl(url, token);
}
