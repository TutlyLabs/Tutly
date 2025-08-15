"use client";

import { useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import UserPage from "./_components/UserPage";

export default function ManageUsersPage() {
  const searchParams = useSearchParams();
  const search = searchParams.get("search") || undefined;
  const sort = searchParams.get("sort") || "name";
  const direction = searchParams.get("direction") || "asc";
  const filter = searchParams.getAll("filter");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const { data: manageUsersData, isLoading } =
    api.users.getTutorManageUsersData.useQuery({
      search,
      sort,
      direction,
      filter,
      page,
      limit,
    });

  if (isLoading) {
    return <div>Loading users data...</div>;
  }

  if (!manageUsersData?.success || !manageUsersData.data) {
    return <div>Failed to load users data or access denied.</div>;
  }

  const { users, totalItems, userRole, isAdmin } = manageUsersData.data;

  return (
    <UserPage
      data={users}
      totalItems={totalItems}
      userRole={userRole}
      isAdmin={isAdmin}
    />
  );
}
