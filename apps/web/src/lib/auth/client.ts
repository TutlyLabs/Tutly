"use client";

import { authClient } from "@/lib/auth-client";

export function useClientSession() {
  const session = authClient.useSession();
  return session;
}
