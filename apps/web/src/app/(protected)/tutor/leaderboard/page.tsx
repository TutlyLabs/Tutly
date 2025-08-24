import { api } from "@/trpc/server";
import Leaderboard from "./_components/leaderBoard";

interface TutorLeaderboardPageProps {
  searchParams: Promise<{
    course?: string;
    mentor?: string;
  }>;
}

export default async function TutorLeaderboardPage({
  searchParams,
}: TutorLeaderboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const course = resolvedSearchParams.course || undefined;
  const mentor = resolvedSearchParams.mentor || undefined;

  const leaderboardData = await api.leaderboard.getTutorLeaderboardData({
    course,
    mentor,
  });

  if (!leaderboardData?.success || !leaderboardData.data) {
    return <div>Failed to load leaderboard data.</div>;
  }

  const {
    submissions,
    courses,
    currentUser,
    mentors,
    selectedCourse,
    selectedMentor,
  } = leaderboardData.data;

  return (
    <Leaderboard
      submissions={submissions}
      courses={courses}
      currentUser={currentUser}
      mentors={mentors}
      selectedCourse={selectedCourse}
      selectedMentor={selectedMentor}
    />
  );
}
