import { api } from "@/trpc/server";
import Leaderboard from "./_components/leaderboard";

export default async function LeaderboardPage() {
  const leaderboardData = await api.leaderboard.getLeaderboardData();

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
