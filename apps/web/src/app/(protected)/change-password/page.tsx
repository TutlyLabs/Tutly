"use client";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import ChangePassword from "@/app/(protected)/profile/_components/ChangePassword";

export default function ChangePasswordPage() {
  const q = api.users.checkUserPassword.useQuery();
  if (q.isLoading) return <PageLoader />;
  if (!q.data?.success || !q.data.data) {
    return <div>Failed to load user data.</div>;
  }
  const { isPasswordExists, email } = q.data.data;
  return (
    <div>
      <ChangePassword isPasswordExists={isPasswordExists} email={email ?? ""} />
    </div>
  );
}
