"use client";

import type { Course } from "@tutly/api/schema";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";

import AddCourse from "./AddCourse";
import CourseCard from "./CourseCard";
import NoDataFound from "../../../../components/NoDataFound";
import { api } from "@/trpc/react";

export default function CoursesPageClient({ user }: { user: SessionUser }) {
  const router = useRouter();
  const { data: coursesData } = api.courses.getEnrolledCourses.useQuery();

  if (!user) {
    router.push("/sign-in");
    return null;
  }

  if (!coursesData?.data) return null;

  const publishedCourses = coursesData.data.filter(
    (course: Course) => course.isPublished,
  );
  const coursesFinal =
    user.role === "INSTRUCTOR" ? coursesData.data : publishedCourses;

  return (
    <div className="w-full">
      <div className="flex w-full">
        {coursesFinal?.length === 0 && (
          <div>
            {user.role === "INSTRUCTOR" && !user.isAdmin ? (
              <AddCourse />
            ) : (
              <NoDataFound message="No courses found!" />
            )}
          </div>
        )}

        {coursesFinal?.length > 0 && (
          <div className="flex flex-wrap">
            {coursesFinal.map((course: Course) => (
              <CourseCard key={course.id} course={course} currentUser={user} />
            ))}
            {user.role === "INSTRUCTOR" && !user.isAdmin && <AddCourse />}
          </div>
        )}
      </div>
    </div>
  );
}
