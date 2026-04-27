"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Navigate } from "@/components/auth/Navigate";
import { FullPageSpinnerSkeleton } from "@/components/loader/Skeletons";
import { ScrollArea, ScrollBar } from "@tutly/ui/scroll-area";
import { api } from "@/trpc/react";
import { cn } from "@tutly/utils";

import StudentStats from "../../tutor/statistics/_components/studentStats";
import { Skeleton } from "@tutly/ui/skeleton";

export default function StatisticsDetailPage() {
  const courseId = useSearchParams().get("id") ?? "";
  const q = api.courses.getAllCourses.useQuery();

  if (!courseId) return <Navigate to="/404" />;
  if (q.isLoading) return <FullPageSpinnerSkeleton />;
  const courses = q.data?.data ?? [];
  const hasAccess = courses.some((c: { id: string }) => c.id === courseId);
  if (!hasAccess) return <Navigate to="/404" />;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div>
        <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          Statistics
        </h1>
        <p className="text-muted-foreground text-sm">
          Your progress across enrolled courses.
        </p>
      </div>

      {/* Course chips — horizontal scroll, no wrap */}
      <ScrollArea className="-mx-3 sm:mx-0">
        <div className="flex items-center gap-2 px-3 pb-2 sm:px-0">
          {courses.map((course: { id: string; title: string }) => {
            const active = course.id === courseId;
            return (
              <Link
                key={course.id}
                href={`/statistics/detail?id=${course.id}`}
                className={cn(
                  "inline-flex h-8 shrink-0 cursor-pointer items-center rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-card text-foreground/70 hover:bg-accent hover:text-foreground",
                )}
              >
                {course.title}
              </Link>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>

      <Suspense
        key={courseId}
        fallback={<StatisticsLoadingSkeleton />}
      >
        <StudentStats courseId={courseId} />
      </Suspense>
    </div>
  );
}

function StatisticsLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <Skeleton className="h-[300px] w-full rounded-xl md:w-1/3" />
        <Skeleton className="h-[300px] w-full rounded-xl md:w-2/3" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}
