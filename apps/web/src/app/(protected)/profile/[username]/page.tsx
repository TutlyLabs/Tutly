import { redirect } from "next/navigation";
import { db } from "@/lib/db";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProfilePage({
  params,
  searchParams,
}: ProfilePageProps) {
  const { username } = await params;
  const enrolledUser = await db.enrolledUsers.findFirst({
    where: {
      username: username.toUpperCase(),
    },
    include: {
      course: {
        select: {
          id: true,
        },
      },
      user: {
        select: {
          role: true,
        },
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });
  const course = enrolledUser?.course;
  const isMentor = enrolledUser?.user?.role === "MENTOR";

  if (!course) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div>No enrolled courses found</div>
      </div>
    );
  }

  redirect(
    `/tutor/statistics/${course.id}?${isMentor ? "mentor" : "student"}=${username}`,
  );
}
