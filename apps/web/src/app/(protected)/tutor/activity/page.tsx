"use client";

import { useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import UserCards from "./_components/UserCards";

export default function ActivityPage() {
  const searchParams = useSearchParams();
  const search = searchParams.get("search") || undefined;
  const filter = searchParams.getAll("filter");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const { data: activityData, isLoading } =
    api.users.getTutorActivityData.useQuery({
      search,
      filter,
      page,
      limit,
    });

  if (isLoading) {
    return <div>Loading activity data...</div>;
  }

  if (!activityData?.success || !activityData.data) {
    return <div>Failed to load activity data or access denied.</div>;
  }

  const { users, totalItems, activeCount } = activityData.data;

  return (
    <UserCards data={users} totalItems={totalItems} activeCount={activeCount} />
  );
}
