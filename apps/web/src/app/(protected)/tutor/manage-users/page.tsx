import { api } from "@/trpc/server";
import UserPage from "./_components/UserPage";

interface ManageUsersPageProps {
  searchParams: Promise<{
    search?: string;
    sort?: string;
    direction?: string;
    filter?: string[];
    page?: string;
    limit?: string;
  }>;
}

export default async function ManageUsersPage({
  searchParams,
}: ManageUsersPageProps) {
  const resolvedSearchParams = await searchParams;
  const search = resolvedSearchParams.search || undefined;
  const sort = resolvedSearchParams.sort || "name";
  const direction = resolvedSearchParams.direction || "asc";
  const filter = resolvedSearchParams.filter || [];
  const page = parseInt(resolvedSearchParams.page || "1");
  const limit = parseInt(resolvedSearchParams.limit || "10");

  const manageUsersData = await api.users.getTutorManageUsersData({
    search,
    sort,
    direction,
    filter,
    page,
    limit,
  });

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
