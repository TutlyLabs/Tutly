"use client";

import type { SessionUser } from "@/lib/auth";
import UsersTable from "./UsersTable";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";

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
    return (
      <div className="w-full space-y-6 px-4">
        {/* Management Header */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Users Table Shimmer */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" /> {/* Table Header */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center space-x-4 rounded-lg border p-4"
            >
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
