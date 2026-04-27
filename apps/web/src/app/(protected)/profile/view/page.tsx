"use client";

import { useSearchParams } from "next/navigation";
import { Navigate } from "@/components/auth/Navigate";

export default function ProfileViewPage() {
  const username = useSearchParams().get("u") ?? "";
  if (!username) return <Navigate to="/profile" />;
  return <Navigate to={`/u/${username}`} />;
}
