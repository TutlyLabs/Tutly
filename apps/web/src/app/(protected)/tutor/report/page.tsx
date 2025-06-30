"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

export default function ReportPage() {
  const router = useRouter();
  const { data: coursesData, isLoading } =
    api.courses.checkUserEnrolledCourses.useQuery();

  useEffect(() => {
    if (!isLoading && coursesData) {
      if (!coursesData.success) {
        router.push("/instructor/no-courses");
        return;
      }

      if (!coursesData.data?.hasEnrolledCourses) {
        router.push("/instructor/no-courses");
        return;
      }

      router.push("/tutor/report/all");
    }
  }, [coursesData, isLoading, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <div>Redirecting...</div>;
}
