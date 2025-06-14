import { notFound, redirect } from "next/navigation";
import { Barchart } from "../_components/barchart";
import { Linechart } from "../_components/linechart";
import { Piechart } from "../_components/piechart";
import Header from "../_components/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import StudentStats from "../_components/studentStats";
import TabView from "../_components/TabView";
import { EvaluationStats } from "../_components/evaluationStats";
import { getServerSessionOrRedirect } from "@tutly/auth";
import { db } from "@tutly/db";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import MenteeCount from "../_components/MenteeCount";

export default async function StatisticsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { courseId } = await params;
  const { mentor, student } = await searchParams;
  const mentorUsername = mentor as string | undefined;
  const studentUsername = student as string | undefined;
  const session = await getServerSessionOrRedirect();
  const currentUser = session.user;

  if (currentUser.role !== "INSTRUCTOR" && currentUser.role !== "MENTOR") {
    return notFound();
  }

  const enrolledCourses = await db.enrolledUsers.findMany({
    where: {
      username: currentUser.username,
    },
  });

  if (!enrolledCourses?.some((course) => course.courseId === courseId)) {
    return notFound();
  }

  if (currentUser.role === "MENTOR" && !mentorUsername) {
    redirect(`/tutor/statistics/${courseId}?mentor=${currentUser.username}`);
  }

  if (currentUser.role === "MENTOR" && mentorUsername !== currentUser.username) {
    return notFound();
  }

  return (
    <>
      <Header
        courseId={courseId}
        userRole={currentUser.role as "INSTRUCTOR" | "MENTOR"}
        username={currentUser.username}
      />
      {studentUsername ? (
        <Suspense fallback={<StatisticsLoadingSkeleton />}>
          <StudentStats
            courseId={courseId}
            studentUsername={studentUsername}
            mentorUsername={mentorUsername}
          />
        </Suspense>
      ) : (
        <>
          <div className="mx-4 flex flex-col gap-4 md:mx-8 md:gap-6 mt-6">
            <div className="flex flex-col gap-4 md:gap-6 lg:flex-row">
              <div className="w-full rounded-xl shadow-xl shadow-blue-500/5 lg:w-[350px]">
                <Suspense fallback={<PiechartLoadingSkeleton />}>
                  <Piechart courseId={courseId} mentorUsername={mentorUsername} />
                </Suspense>
              </div>
              <div className="flex w-full flex-col gap-2 rounded-xl shadow-xl shadow-blue-500/5 md:flex-row lg:w-3/4">
                <div className="flex w-full flex-col gap-4 p-4 text-gray-500 md:w-1/3 md:gap-6 md:p-14">
                  <div className="relative rounded-xl border-4 p-4">
                    <h1 className="absolute -top-3 bg-background px-1 text-sm md:text-base">
                      Total Students
                    </h1>
                    <h1 className="flex items-baseline justify-between text-2xl font-bold text-primary-500 md:text-4xl">
                      <MenteeCount courseId={courseId} mentorUsername={mentorUsername} />
                    </h1>
                  </div>
                  <div className="relative rounded-xl border-4 p-4">
                    <h1 className="absolute -top-3 bg-background px-1 text-sm md:text-base">
                      Total Sessions
                    </h1>
                    <h1 className="text-2xl font-bold text-primary-500 md:text-4xl">13</h1>
                  </div>
                </div>
                <div className="w-full md:w-[600px]">
                  <Suspense fallback={<LinechartLoadingSkeleton />}>
                    <Linechart courseId={courseId} mentorUsername={mentorUsername} />
                  </Suspense>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 md:gap-6 lg:flex-row">
              <div className="max-h-[300px] w-full rounded-xl shadow-xl shadow-blue-500/5 lg:w-3/4">
                <Suspense fallback={<BarchartLoadingSkeleton />}>
                  <Barchart courseId={courseId} mentorUsername={mentorUsername} />
                </Suspense>
              </div>
              <div className="w-full lg:w-1/4">
                <Suspense fallback={<EvaluationLoadingSkeleton />}>
                  <EvaluationStats courseId={courseId} mentorUsername={mentorUsername} />
                </Suspense>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <Suspense fallback={<TabViewLoadingSkeleton />}>
              <TabView
                mentorName={mentorUsername || ""}
                menteeName={studentUsername || ""}
                courseId={courseId}
                userRole={currentUser.role as "INSTRUCTOR" | "MENTOR"}
              />
            </Suspense>
          </div>
        </>
      )}
    </>
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

function PiechartLoadingSkeleton() {
  return (
    <Card className="flex flex-col h-full w-full">
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
        <Skeleton className="h-8 w-24 mx-auto" />
      </div>
      <div className="m-auto my-4 w-4/5 rounded-full border border-gray-700">
        <Skeleton className="h-[10px] w-1/2 rounded-full" />
      </div>
      <Skeleton className="h-4 w-48 mx-auto" />
    </>
  );
}

function TabViewLoadingSkeleton() {
  return (
    <div className="mt-8 space-y-6 mx-4 md:mx-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[400px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[120px] w-full" />
        ))}
      </div>
    </div>
  );
} 