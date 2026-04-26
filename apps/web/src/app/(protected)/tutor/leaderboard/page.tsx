"use client";

import { useSearchParams } from "next/navigation";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import Leaderboard from "./_components/leaderBoard";

export default function TutorLeaderboardPage() {
  const sp = useSearchParams();
  const course = sp.get("course") ?? undefined;
  const mentor = sp.get("mentor") ?? undefined;

  const q = api.leaderboard.getTutorLeaderboardData.useQuery({
    course,
    mentor,
  });
  if (q.isLoading) return <PageLoader />;
  if (!q.data?.success || !q.data.data) {
    return <div>Failed to load leaderboard data.</div>;
  }
  const {
    submissions,
    courses,
    currentUser,
    mentors,
    selectedCourse,
    selectedMentor,
  } = q.data.data;
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
