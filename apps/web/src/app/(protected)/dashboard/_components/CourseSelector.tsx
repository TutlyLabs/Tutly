"use client";

import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tutly/ui/select";
import { api } from "@/trpc/react";
import { Skeleton } from "@tutly/ui/skeleton";

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
    return <Skeleton className="h-9 w-full bg-white/30 sm:w-44" />;
  }

  if (
    !courseSelectorData?.success ||
    !courseSelectorData.data?.courses.length
  ) {
    return null;
  }

  const { courses } = courseSelectorData.data;

  return (
    <Select
      value={selectedCourse}
      onValueChange={onCourseChange}
      defaultValue={courses[0]?.courseId ?? ""}
    >
      <SelectTrigger className="h-9 w-full cursor-pointer rounded-lg border-transparent !bg-white px-3 text-sm font-medium !text-slate-900 shadow-sm transition-colors hover:!bg-white/90 dark:!bg-white dark:hover:!bg-white/90 sm:w-52 [&_svg]:!text-slate-500">
        <SelectValue placeholder="Select a course" />
      </SelectTrigger>
      <SelectContent
        align="end"
        className="border-slate-200 bg-white text-slate-900"
      >
        {courses.map((course: { courseId: string; courseTitle: string }) => (
          <SelectItem
            key={course.courseId}
            value={course.courseId}
            className="cursor-pointer text-slate-900 focus:bg-slate-100 focus:text-slate-900 data-[state=checked]:bg-slate-100"
          >
            {course.courseTitle}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
