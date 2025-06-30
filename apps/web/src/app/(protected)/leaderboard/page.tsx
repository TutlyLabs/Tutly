"use client";

import { api } from "@/trpc/react";
import Leaderboard from "./_components/leaderboard";

export default function LeaderboardPage() {
  const { data: leaderboardData, isLoading } =
    api.leaderboard.getLeaderboardData.useQuery();

  if (isLoading) {
    return <div>Loading leaderboard...</div>;
  }

  if (!leaderboardData?.success || !leaderboardData.data) {
    return <div>Failed to load leaderboard data.</div>;
  }

  const { currentUser, submissions, courses } = leaderboardData.data;

  return (
    <Leaderboard
      currentUser={currentUser}
      submissions={submissions}
      courses={courses}
    />
  );
}
