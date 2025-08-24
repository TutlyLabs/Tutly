"use client";

import { authClient } from "@/server/auth/client";

export function useClientSession() {
  const session = authClient.useSession();
  return session;
}
