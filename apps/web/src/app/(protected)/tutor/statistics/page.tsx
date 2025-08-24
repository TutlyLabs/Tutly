import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import NoDataFound from "@/components/NoDataFound";

export default async function StatisticsPage() {
  const { data: courses } = await api.courses.getAllCourses();

  if (courses && courses.length > 0) {
    redirect(`/tutor/statistics/${courses[0]?.id}`);
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <NoDataFound message="No enrolled courses found" />
    </div>
  );
}
