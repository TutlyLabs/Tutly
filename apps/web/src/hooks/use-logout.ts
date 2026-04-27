"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { authClient } from "@/server/auth/client";
import { setBiometricLockEnabled } from "@/lib/biometric";
import { resetCrispSession } from "@/components/Crisp";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useCallback(async () => {
    localStorage.removeItem("bearer_token");
    await setBiometricLockEnabled(false);
    queryClient.clear();
    resetCrispSession();
    await authClient.signOut();
    router.push("/sign-in");
  }, [router, queryClient]);
}
