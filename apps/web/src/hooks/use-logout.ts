"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/server/auth/client";

export function useLogout() {
  const router = useRouter();

  return useCallback(async () => {
    localStorage.removeItem("bearer_token");
    await authClient.signOut();
    router.push("/sign-in");
  }, [router]);
}
