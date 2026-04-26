"use client";

import { useSearchParams } from "next/navigation";

import ManagePassword from "@/app/(protected)/profile/_components/ManagePassword";

export default function ResetPasswordPage() {
  const sp = useSearchParams();
  const email = sp.get("email") ?? undefined;
  const token = sp.get("token") ?? undefined;
  return (
    <div className="flex min-h-screen items-center justify-center">
      <ManagePassword initialEmail={email} token={token} />
    </div>
  );
}
