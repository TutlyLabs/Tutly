"use client";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import Leaderboard from "./_components/leaderboard";

export default function LeaderboardPage() {
  const q = api.leaderboard.getLeaderboardData.useQuery();
  if (q.isLoading) return <PageLoader />;
  if (!q.data?.success || !q.data.data) {
    return <div>Failed to load leaderboard data.</div>;
  }
  const { currentUser, submissions, courses } = q.data.data;
  return (
    <Leaderboard
      currentUser={currentUser}
      submissions={submissions}
      courses={courses}
    />
  );
}
