"use client";

import type { Course } from "@prisma/client";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";

import AddCourse from "./AddCourse";
import CourseCard from "./CourseCard";
import NoDataFound from "../../../../components/NoDataFound";

interface CoursesPageClientProps {
  user: SessionUser;
  coursesData: { success: boolean; data: Course[] } | undefined;
}

export default function CoursesPageClient({ user, coursesData }: CoursesPageClientProps) {
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

  return (
    <div className="w-full">
      <div className="flex w-full">
        {coursesFinal?.length === 0 && (
          <div>
            {user.role === "INSTRUCTOR" && !user.isAdmin ? (
              <AddCourse />
            ) : (
              <NoDataFound
                message="No courses found!"
                className="flex h-[80vh] w-[80vw] flex-col items-center justify-center"
              />
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
