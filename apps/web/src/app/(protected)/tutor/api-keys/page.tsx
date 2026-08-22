"use client";

import { hasPermission } from "@tutly/auth/access-control";
import type { Role } from "@tutly/db/browser";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import NoDataFound from "@/components/NoDataFound";
import PageLoader from "@/components/loader/PageLoader";

import ApiKeys from "./_components/ApiKeys";

/**
 * The tutor layout admits MENTOR, so this narrows to INSTRUCTOR+. Display gate
 * only; `/api/auth/api-key/*` enforces the same rule server-side.
 */
export default function ApiKeysPage() {
  const { user, isPending } = useAuthSession();

  if (isPending || !user) return <PageLoader />;
  if (!hasPermission(user.role as Role, { apiKey: ["create"] })) {
    return <NoDataFound message="Not found" />;
  }

  return <ApiKeys />;
}
