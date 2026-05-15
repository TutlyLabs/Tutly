"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import UserCards from "./_components/UserCards";

export default function ActivityPage() {
  const sp = useSearchParams();
  const search = sp.get("search") ?? undefined;
  const baseFilter = sp.getAll("filter");
  const lastSeen = sp.get("lastSeen");
  const page = parseInt(sp.get("page") ?? "1");
  const limit = parseInt(sp.get("limit") ?? "10");

  const presetFilter = (() => {
    switch (lastSeen) {
      case "online":
        return "lastSeen:online:1";
      case "1h":
        return "lastSeen:seen_within_hours:1";
      case "24h":
        return "lastSeen:seen_within_hours:24";
      case "7d":
        return "lastSeen:seen_within_hours:168";
      case "stale-24h":
        return "lastSeen:seen_before_hours:24";
      case "never":
        return "lastSeen:never_seen:1";
      default:
        return null;
    }
  })();
  const filter = presetFilter ? [...baseFilter, presetFilter] : baseFilter;

  const q = api.users.getTutorActivityData.useQuery(
    { search, filter, page, limit },
    { placeholderData: keepPreviousData },
  );
  if (!q.data && q.isLoading) return <PageLoader />;
  if (q.data && (!q.data.success || !q.data.data)) {
    return <div>Failed to load activity data or access denied.</div>;
  }
  const data = q.data?.data;
  return (
    <UserCards
      data={data?.users ?? []}
      totalItems={data?.totalItems ?? 0}
      activeCount={data?.activeCount ?? 0}
      neverSeenCount={data?.neverSeenCount ?? 0}
      last1hCount={data?.last1hCount ?? 0}
      last24hCount={data?.last24hCount ?? 0}
      last7dCount={data?.last7dCount ?? 0}
      isRefetching={q.isFetching && !q.isLoading}
    />
  );
}
