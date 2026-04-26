"use client";

import { useAuthSession } from "@/components/auth/ProtectedShell";
import NoDataFound from "@/components/NoDataFound";
import PageLoader from "@/components/loader/PageLoader";

const ALLOWED_ROLES = ["INSTRUCTOR", "MENTOR"];

export default function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isPending } = useAuthSession();
  if (isPending || !user) return <PageLoader />;
  if (!ALLOWED_ROLES.includes(user.role))
    return <NoDataFound message="Not found" />;
  return <div>{children}</div>;
}
