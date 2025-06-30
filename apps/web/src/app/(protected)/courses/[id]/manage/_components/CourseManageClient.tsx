"use client";

import type { SessionUser } from "@/lib/auth";
import UsersTable from "./UsersTable";
import { api } from "@/trpc/react";

interface Props {
  courseId: string;
  currentUser: SessionUser;
}

export default function CourseManageClient({ courseId, currentUser }: Props) {
  const { data: usersData, isLoading } =
    api.courses.getCourseManagementUsers.useQuery({
      courseId,
    });

  if (isLoading) {
    return <div>Loading course management data...</div>;
  }

  if (!usersData?.success || !usersData.data) {
    return <div>Failed to load course management data or access denied.</div>;
  }

  return (
    <div className="w-full px-4">
      <UsersTable users={usersData.data} courseId={courseId} />
    </div>
  );
}
