"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Navigate } from "@/components/auth/Navigate";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import StudentStats from "../../tutor/statistics/_components/studentStats";
import { Skeleton } from "@tutly/ui/skeleton";

export default function StatisticsDetailPage() {
  const courseId = useSearchParams().get("id") ?? "";
  const q = api.courses.getAllCourses.useQuery();

  if (!courseId) return <Navigate to="/404" />;
  if (q.isLoading) return <PageLoader />;
  const courses = q.data?.data ?? [];
  const hasAccess = courses.some((c: { id: string }) => c.id === courseId);
  if (!hasAccess) return <Navigate to="/404" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="mx-4 mb-2 flex items-center gap-2 md:mx-8">
        {courses.map((course: { id: string; title: string }) => (
          <Link
            key={course.id}
            href={`/statistics/detail?id=${course.id}`}
            className={`rounded-lg border p-1 px-2 ${course.id === courseId ? "border-primary" : ""}`}
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
