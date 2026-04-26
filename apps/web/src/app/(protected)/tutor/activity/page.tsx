"use client";

import { useSearchParams } from "next/navigation";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import UserCards from "./_components/UserCards";

export default function ActivityPage() {
  const sp = useSearchParams();
  const search = sp.get("search") ?? undefined;
  const filter = sp.getAll("filter");
  const page = parseInt(sp.get("page") ?? "1");
  const limit = parseInt(sp.get("limit") ?? "10");

  const q = api.users.getTutorActivityData.useQuery({
    search,
    filter,
    page,
    limit,
  });
  if (q.isLoading) return <PageLoader />;
  if (!q.data?.success || !q.data.data) {
    return <div>Failed to load activity data or access denied.</div>;
  }
  const { users, totalItems, activeCount } = q.data.data;
  return (
    <UserCards data={users} totalItems={totalItems} activeCount={activeCount} />
  );
}
