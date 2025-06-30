"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Barchart } from "../_components/barchart";
import { Linechart } from "../_components/linechart";
import { Piechart } from "../_components/piechart";
import Header from "../_components/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import StudentStats from "../_components/studentStats";
import TabView from "../_components/TabView";
import { EvaluationStats } from "../_components/evaluationStats";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import MenteeCount from "../_components/MenteeCount";

export default function StatisticsDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [courseId, setCourseId] = useState<string | null>(null);
  const [mentorUsername, setMentorUsername] = useState<string | undefined>(
    undefined,
  );
  const [studentUsername, setStudentUsername] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    params.then(({ courseId: id }) => {
      setCourseId(id);
    });
  }, [params]);

  useEffect(() => {
    if (searchParams) {
      const mentor = searchParams.get("mentor") as string | undefined;
      const student = searchParams.get("student") as string | undefined;
      setMentorUsername(mentor);
      setStudentUsername(student);
    }
  }, [searchParams]);

  const {
    data: statisticsData,
    isLoading,
    error,
  } = api.statistics.getStatisticsPageData.useQuery(
    {
      courseId: courseId!,
      mentorUsername,
      studentUsername,
    },
    { enabled: !!courseId },
  );

  useEffect(() => {
    if (statisticsData?.success === false) {
      if (statisticsData.redirectTo) {
        router.push(statisticsData.redirectTo);
      } else {
        router.push("/");
      }
    }
  }, [statisticsData, router]);

  if (isLoading) {
    return <div>Loading statistics...</div>;
  }

  if (error) {
    return <div>Error loading statistics</div>;
  }

  if (!statisticsData?.success || !statisticsData.data) {
    return <div>No statistics data found!</div>;
  }

  const {
    courseId: id,
    mentorUsername: mentor,
    studentUsername: student,
    userRole,
    username,
  } = statisticsData.data;

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
          <div className="mx-4 mt-6 flex flex-col gap-4 md:mx-8 md:gap-6">
            <div className="flex flex-col gap-4 md:gap-6 lg:flex-row">
              <div className="w-full rounded-xl shadow-xl shadow-blue-500/5 lg:w-[350px]">
                <Suspense fallback={<PiechartLoadingSkeleton />}>
                  <Piechart courseId={id} mentorUsername={mentor} />
                </Suspense>
              </div>
              <div className="flex w-full flex-col gap-2 rounded-xl shadow-xl shadow-blue-500/5 md:flex-row lg:w-3/4">
                <div className="flex w-full flex-col gap-4 p-4 text-gray-500 md:w-1/3 md:gap-6 md:p-14">
                  <div className="relative rounded-xl border-4 p-4">
                    <h1 className="bg-background absolute -top-3 px-1 text-sm md:text-base">
                      Total Students
                    </h1>
                    <h1 className="text-primary-500 flex items-baseline justify-between text-2xl font-bold md:text-4xl">
                      <MenteeCount courseId={id} mentorUsername={mentor} />
                    </h1>
                  </div>
                  <div className="relative rounded-xl border-4 p-4">
                    <h1 className="bg-background absolute -top-3 px-1 text-sm md:text-base">
                      Total Sessions
                    </h1>
                    <h1 className="text-primary-500 text-2xl font-bold md:text-4xl">
                      13
                    </h1>
                  </div>
                </div>
                <div className="w-full md:w-[600px]">
                  <Suspense fallback={<LinechartLoadingSkeleton />}>
                    <Linechart courseId={id} mentorUsername={mentor} />
                  </Suspense>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 md:gap-6 lg:flex-row">
              <div className="max-h-[300px] w-full rounded-xl shadow-xl shadow-blue-500/5 lg:w-3/4">
                <Suspense fallback={<BarchartLoadingSkeleton />}>
                  <Barchart courseId={id} mentorUsername={mentor} />
                </Suspense>
              </div>
              <div className="w-full lg:w-1/4">
                <Suspense fallback={<EvaluationLoadingSkeleton />}>
                  <EvaluationStats courseId={id} mentorUsername={mentor} />
                </Suspense>
              </div>
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
      <div className="m-auto my-4 w-4/5 rounded-full border border-gray-700">
        <Skeleton className="h-[10px] w-1/2 rounded-full" />
      </div>
      <Skeleton className="mx-auto h-4 w-48" />
    </>
  );
}

function TabViewLoadingSkeleton() {
  return (
    <div className="mx-4 mt-8 space-y-6 md:mx-8">
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
