"use client";

import { useSearchParams } from "next/navigation";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import UserPage from "./_components/UserPage";

export default function ManageUsersPage() {
  const sp = useSearchParams();
  const search = sp.get("search") ?? undefined;
  const sort = sp.get("sort") ?? "name";
  const direction = sp.get("direction") ?? "asc";
  const filter = sp.getAll("filter");
  const page = parseInt(sp.get("page") ?? "1");
  const limit = parseInt(sp.get("limit") ?? "10");

  const q = api.users.getTutorManageUsersData.useQuery({
    search,
    sort,
    direction,
    filter,
    page,
    limit,
  });
  if (q.isLoading) return <PageLoader />;
  if (!q.data?.success || !q.data.data) {
    return <div>Failed to load users data or access denied.</div>;
  }
  const { users, totalItems, userRole, isAdmin } = q.data.data;
  return (
    <UserPage
      data={users}
      totalItems={totalItems}
      userRole={userRole}
      isAdmin={isAdmin}
    />
  );
}
