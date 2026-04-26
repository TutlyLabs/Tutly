"use client";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import Community from "./_components/CommunityPage";

export default function CommunityPage() {
  const q = api.doubts.getEnrolledCoursesDoubts.useQuery();
  if (q.isLoading) return <PageLoader />;
  if (!q.data?.success || !q.data.data) {
    return <div>No community data available</div>;
  }
  return <Community allDoubts={q.data.data} />;
}
