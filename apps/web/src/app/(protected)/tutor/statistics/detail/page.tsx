"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Navigate } from "@/components/auth/Navigate";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import { Barchart } from "../_components/barchart";
import { Linechart } from "../_components/linechart";
import { Piechart } from "../_components/piechart";
import Header from "../_components/header";
import { Card, CardContent, CardHeader } from "@tutly/ui/card";
import StudentStats from "../_components/studentStats";
import TabView from "../_components/TabView";
import { EvaluationStats } from "../_components/evaluationStats";
import { Skeleton } from "@tutly/ui/skeleton";
import MenteeCount from "../_components/MenteeCount";

export default function StatisticsDetailPage() {
  const sp = useSearchParams();
  const courseId = sp.get("id") ?? "";
  const mentorUsername = sp.get("mentor") ?? undefined;
  const studentUsername = sp.get("student") ?? undefined;

  const q = api.statistics.getStatisticsPageData.useQuery({
    courseId,
    mentorUsername,
    studentUsername,
  });
  if (q.isLoading) return <PageLoader />;
  if (q.data?.success === false) {
    return <Navigate to={q.data.redirectTo ?? "/"} />;
  }
  if (!q.data?.success || !q.data.data)
    return <div>No statistics data found!</div>;

  const {
    courseId: id,
    mentorUsername: mentor,
    studentUsername: student,
    userRole,
    username,
  } = q.data.data;

  return (
    <>
      <Header courseId={id} userRole={userRole} username={username} />
      {student ? (
        <Suspense fallback={<StatisticsLoadingSkeleton />}>
          <StudentStats
            courseId={id}
            studentUsername={student}
            mentorUsername={mentor}
          />
        </Suspense>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Suspense fallback={<PiechartLoadingSkeleton />}>
                <Piechart courseId={id} mentorUsername={mentor} />
              </Suspense>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1">
              <MetricCard label="Total Students">
                <MenteeCount courseId={id} mentorUsername={mentor} />
              </MetricCard>
              <MetricCard label="Total Sessions">13</MetricCard>
            </div>
            <div className="lg:col-span-6">
              <Suspense fallback={<LinechartLoadingSkeleton />}>
                <Linechart courseId={id} mentorUsername={mentor} />
              </Suspense>
            </div>
            <div className="lg:col-span-8">
              <Suspense fallback={<BarchartLoadingSkeleton />}>
                <Barchart courseId={id} mentorUsername={mentor} />
              </Suspense>
            </div>
            <div className="lg:col-span-4">
              <Suspense fallback={<EvaluationLoadingSkeleton />}>
                <EvaluationStats courseId={id} mentorUsername={mentor} />
              </Suspense>
            </div>
          </div>
          <div className="mt-8">
            <Suspense fallback={<TabViewLoadingSkeleton />}>
              <TabView
                mentorName={mentor || ""}
                menteeName={student || ""}
                courseId={id}
                userRole={userRole}
              />
            </Suspense>
          </div>
        </>
      )}
    </>
  );
}

function MetricCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card flex h-full flex-col justify-between rounded-xl border p-4 shadow-sm">
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      <span className="text-foreground text-3xl font-semibold tabular-nums">
        {children}
      </span>
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

function PiechartLoadingSkeleton() {
  return (
    <Card className="flex h-full w-full flex-col">
      <CardHeader className="items-center pb-2">
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent className="flex-1">
        <Skeleton className="h-[200px] w-full rounded-full" />
      </CardContent>
    </Card>
  );
}

function LinechartLoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[250px] w-full" />
      </CardContent>
    </Card>
  );
}

function BarchartLoadingSkeleton() {
  return (
    <Card className="h-full w-full">
      <CardHeader>
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent className="h-[190px] w-full">
        <Skeleton className="h-[190px] w-full" />
      </CardContent>
    </Card>
  );
}

function EvaluationLoadingSkeleton() {
  return (
    <>
      <div className="px-4 text-center font-semibold text-blue-500 md:px-16">
        <Skeleton className="mx-auto h-8 w-24" />
      </div>
      <div className="border-border m-auto my-4 w-4/5 rounded-full border">
        <Skeleton className="h-[10px] w-1/2 rounded-full" />
      </div>
      <Skeleton className="mx-auto h-4 w-48" />
    </>
  );
}

function TabViewLoadingSkeleton() {
  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[400px]" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[120px] w-full" />
        ))}
      </div>
    </div>
  );
}
