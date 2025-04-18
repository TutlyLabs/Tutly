import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import NoDataFound from "@/components/NoDataFound";

export default async function StatisticsPage() {
  const { data } = await api.courses.getAllCourses();
  if (!data) return null;

  if (data.length > 0) {
    redirect(`/tutor/statistics/${data[0]?.id}`);
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <NoDataFound message="No enrolled courses found" additionalMessage="You haven’t joined any courses yet — hop on in!" />
    </div>
  );
} 