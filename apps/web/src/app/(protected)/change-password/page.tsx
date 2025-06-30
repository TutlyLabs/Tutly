"use client";

import { api } from "@/trpc/react";
import ChangePassword from "@/app/(protected)/profile/_components/ChangePassword";

export default function ChangePasswordPage() {
  const { data: passwordData, isLoading } =
    api.users.checkUserPassword.useQuery();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!passwordData?.success || !passwordData.data) {
    return <div>Failed to load user data.</div>;
  }

  const { isPasswordExists, email } = passwordData.data;

  return (
    <div>
      <ChangePassword isPasswordExists={isPasswordExists} email={email ?? ""} />
    </div>
  );
}
