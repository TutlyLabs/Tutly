import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import Link from "next/link";
import StudentStats from "../../tutor/statistics/_components/studentStats";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatisticsDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function StatisticsDetailPage({
  params,
}: StatisticsDetailPageProps) {
  const { id: courseId } = await params;

  if (!courseId) {
    redirect("/404");
  }

  const { data: courses } = await api.courses.getAllCourses();

  const hasAccess = courses?.some((course: any) => course.id === courseId);

  if (!hasAccess) {
    redirect("/404");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center mx-4 md:mx-8 mb-2">
        {courses?.map((course: any) => (
          <Link
            key={course.id}
            href={`/statistics/${course.id}`}
            className={`p-1 px-2 border rounded-lg ${course.id === courseId ? "border-primary" : ""
              }`}
          >
            {course.title}
          </Link>
        ))}
      </div>
      <Suspense fallback={<StatisticsLoadingSkeleton />}>
        <StudentStats courseId={courseId} />
      </Suspense>
    </div>
  );
}

function StatisticsLoadingSkeleton() {
  return (
    <div className="mx-4 flex flex-col gap-4 md:mx-8 md:gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <Skeleton className="h-[300px] w-full rounded-xl md:w-1/3" />
        <Skeleton className="h-[300px] w-full rounded-xl md:w-3/4" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}