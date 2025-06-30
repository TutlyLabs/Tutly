"use client";

import { useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import Leaderboard from "./_components/leaderBoard";

export default function TutorLeaderboardPage() {
  const searchParams = useSearchParams();
  const course = searchParams.get("course") || undefined;
  const mentor = searchParams.get("mentor") || undefined;

  const { data: leaderboardData, isLoading } =
    api.leaderboard.getTutorLeaderboardData.useQuery({
      course,
      mentor,
    });

  if (isLoading) {
    return <div>Loading leaderboard...</div>;
  }

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
