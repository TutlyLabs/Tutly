import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import NoDataFound from "@/components/NoDataFound";

interface StatisticsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function StatisticsPage({
  searchParams,
}: StatisticsPageProps) {
  const { data: courses } = await api.courses.getAllCourses();
  const resolvedSearchParams = await searchParams;

  if (courses && courses.length > 0) {
    const params = new URLSearchParams();
    Object.entries(resolvedSearchParams).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else {
          params.set(key, value);
        }
      }
    });

    const queryString = params.toString();
    const redirectUrl = `/tutor/statistics/${courses[0]?.id}${queryString ? `?${queryString}` : ""}`;
    redirect(redirectUrl);
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <NoDataFound message="No enrolled courses found" />
    </div>
  );
}
