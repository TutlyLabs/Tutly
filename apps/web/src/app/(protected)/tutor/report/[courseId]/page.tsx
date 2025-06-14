import { redirect } from "next/navigation";
import { getServerSession, getServerSessionOrRedirect } from "@tutly/auth";
import { db } from "@tutly/db";
import Report from "./_components/Report";

export default async function CourseReportPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await getServerSession();
  const user = session?.user;
  const { courseId } = await params;

  if (!courseId || !user || (user.role !== "INSTRUCTOR" && user.role !== "MENTOR")) {
    redirect("/404");
  }

  const enrolledCourses = await db.enrolledUsers.findMany({
    where: {
      username: user.username,
      courseId: {
        not: null,
      },
    },
    include: {
      course: true,
    },
  });

  const courses = enrolledCourses.map((enrolled) => enrolled.course);
  const isMentor = user.role === "MENTOR";

  return (
    <Report
      isMentor={isMentor}
      allCourses={courses}
      courseId={courseId}
    />
  );
} 