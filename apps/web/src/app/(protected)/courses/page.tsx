import { getServerSessionOrRedirect } from "@tutly/auth";
import type { Course } from "@prisma/client";

import AddCourse from "./_components/AddCourse";
import CourseCard from "./_components/CourseCard";
import NoDataFound from "../../../components/NoDataFound";
import { api } from "@/trpc/server";

export default async function CoursesPage() {
  const session = await getServerSessionOrRedirect();

  const courses = await api.courses.getEnrolledCourses();

  if (!courses.data) return null;

  const publishedCourses = courses.data.filter((course: Course) => course.isPublished);
  const coursesFinal = session.user.role === "INSTRUCTOR" ? courses.data : publishedCourses;

  return (
    <div className="w-full">
      <div className="flex w-full">
        {coursesFinal?.length === 0 && (
          <div>
            {session.user.role === "INSTRUCTOR" && !session.user.isAdmin ? (
              <AddCourse />
            ) : (
              <NoDataFound message="No courses found!" additionalMessage="No courses here… maybe they’re on vacation?"/>
            )}
          </div>
        )}

        {coursesFinal?.length > 0 && (
          <div className="flex flex-wrap">
            {coursesFinal.map((course: Course) => (
              <CourseCard key={course.id} course={course} currentUser={session.user} />
            ))}
            {session.user.role === "INSTRUCTOR" && !session.user.isAdmin && <AddCourse />}
          </div>
        )}
      </div>
    </div>
  );
} 