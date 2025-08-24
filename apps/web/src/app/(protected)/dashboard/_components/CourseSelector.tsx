"use client";

import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  selectedCourse: string;
  onCourseChange: (courseId: string) => void;
}

export default function CourseSelector({
  selectedCourse,
  onCourseChange,
}: Props) {
  const { data: courseSelectorData, isLoading } =
    api.dashboard.getCourseSelectorData.useQuery();

  useEffect(() => {
    if (
      courseSelectorData?.success &&
      courseSelectorData.data &&
      courseSelectorData.data.courses.length > 0 &&
      !selectedCourse
    ) {
      onCourseChange(courseSelectorData.data!.courses[0]?.courseId ?? "");
    }
  }, [courseSelectorData, selectedCourse, onCourseChange]);

  if (isLoading) {
    return (
      <div className="text-base font-medium text-white">
        <Skeleton className="h-8 w-32 bg-white" />
      </div>
    );
  }

  if (
    !courseSelectorData?.success ||
    !courseSelectorData.data?.courses.length
  ) {
    return null;
  }

  const { courses } = courseSelectorData.data;

  return (
    <div className="text-base font-medium text-white">
      <Select
        value={selectedCourse}
        onValueChange={onCourseChange}
        defaultValue={courses[0]?.courseId ?? ""}
      >
        <SelectTrigger className="ml-2 rounded-md bg-white px-2 py-1 text-gray-900">
          <SelectValue placeholder="Select a course" />
        </SelectTrigger>
        <SelectContent align="end">
          {courses.map((course: { courseId: string; courseTitle: string }) => (
            <SelectItem key={course.courseId} value={course.courseId}>
              {course.courseTitle}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
