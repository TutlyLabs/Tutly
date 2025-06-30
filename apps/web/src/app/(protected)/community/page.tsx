"use client";

import Community from "./_components/CommunityPage";
import { api } from "@/trpc/react";

export default function CommunityPage() {
  const { data: doubtsData, isLoading } =
    api.doubts.getEnrolledCoursesDoubts.useQuery();

  if (isLoading) {
    return <div>Loading community data...</div>;
  }

  if (!doubtsData?.success || !doubtsData.data) {
    return <div>No community data available</div>;
  }

  const allDoubts = doubtsData.data;

  return (
    <main className="mx-auto flex w-full max-w-screen-xl flex-col items-center justify-center p-4 sm:px-6 lg:px-12">
      <Community allDoubts={allDoubts} />
    </main>
  );
}
