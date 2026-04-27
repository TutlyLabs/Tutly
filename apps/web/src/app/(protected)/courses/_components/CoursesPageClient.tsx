"use client";

import type { Course } from "@tutly/db/browser";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";

import AddCourse from "./AddCourse";
import CourseCard from "./CourseCard";
import NoDataFound from "../../../../components/NoDataFound";

interface CoursesPageClientProps {
  user: SessionUser;
  coursesData: { success: boolean; data: Course[] } | undefined;
}

export default function CoursesPageClient({
  user,
  coursesData,
}: CoursesPageClientProps) {
  const router = useRouter();

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

  const isInstructor = user.role === "INSTRUCTOR" && !user.isAdmin;
  const showEmpty = coursesFinal?.length === 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Courses
          </h1>
          <p className="text-muted-foreground text-sm">
            {showEmpty
              ? isInstructor
                ? "Create your first course to get started."
                : "Nothing here yet — your courses will show up once you're enrolled."
              : `${coursesFinal.length} ${coursesFinal.length === 1 ? "course" : "courses"}`}
          </p>
        </div>
      </div>

      {showEmpty ? (
        isInstructor ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AddCourse />
          </div>
        ) : (
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <NoDataFound
              message="No courses found!"
              className="flex h-[40vh] flex-col items-center justify-center"
            />
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {coursesFinal.map((course: Course) => (
            <CourseCard key={course.id} course={course} currentUser={user} />
          ))}
          {isInstructor && <AddCourse />}
        </div>
      )}
    </div>
  );
}
