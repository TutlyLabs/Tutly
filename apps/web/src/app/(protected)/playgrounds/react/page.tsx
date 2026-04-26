"use client";

import { useAuthSession } from "@/components/auth/ProtectedShell";
import PageLoader from "@/components/loader/PageLoader";
import ReactPlayground from "./ReactPlayground";

export default function ReactPlaygroundPage() {
  const { user } = useAuthSession();
  if (!user) return <PageLoader />;
  return <ReactPlayground currentUser={user} />;
}
