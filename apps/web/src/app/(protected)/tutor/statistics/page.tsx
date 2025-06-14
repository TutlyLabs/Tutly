import { redirect } from "next/navigation";
import { api } from "@/trpc/react";
import NoDataFound from "@/components/NoDataFound";

export default function StatisticsPage() {
  const { data } = api.courses.getAllCourses.useQuery();

  const courses = data?.data ?? [];

  if (courses.length > 0) {
    redirect(`/tutor/statistics/${courses[0]?.id}`);
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <NoDataFound message="No enrolled courses found" additionalMessage="You haven’t joined any courses yet — hop on in!" />
    </div>
  );
} 