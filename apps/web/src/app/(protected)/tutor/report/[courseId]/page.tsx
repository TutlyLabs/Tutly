"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import Report from "./_components/Report";

export default function CourseReportPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ courseId: id }) => {
      setCourseId(id);
    });
  }, [params]);

  const {
    data: reportData,
    isLoading,
    error,
  } = api.report.getReportPageData.useQuery(
    { courseId: courseId! },
    { enabled: !!courseId },
  );

  useEffect(() => {
    if (reportData?.success === false) {
      if (reportData.redirectTo) {
        router.push(reportData.redirectTo);
      } else {
        router.push("/404");
      }
    }
  }, [reportData, router]);

  if (isLoading) {
    return <div>Loading report...</div>;
  }

  if (error) {
    return <div>Error loading report</div>;
  }

  if (!reportData?.success || !reportData.data) {
    return <div>No report data found!</div>;
  }

  const { courseId: id, courses, isMentor } = reportData.data;

  return <Report isMentor={isMentor} allCourses={courses} courseId={id} />;
}
