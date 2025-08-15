"use client";

import { api } from "@/trpc/react";

export default function MenteeCount({
  courseId,
  mentorUsername,
}: {
  courseId: string;
  mentorUsername?: string;
}) {
  const { data: mentees } = api.statistics.getAllMentees.useQuery({
    courseId,
    mentorUsername,
  });

  const menteesArray = Array.isArray(mentees) ? mentees : [];
  return <>{menteesArray.length}</>;
}
