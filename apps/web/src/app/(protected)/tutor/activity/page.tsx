import { api } from "@/trpc/server";
import UserCards from "./_components/UserCards";

interface ActivityPageProps {
  searchParams: Promise<{
    search?: string;
    filter?: string[];
    page?: string;
    limit?: string;
  }>;
}

export default async function ActivityPage({
  searchParams,
}: ActivityPageProps) {
  const resolvedSearchParams = await searchParams;
  const search = resolvedSearchParams.search || undefined;
  const filter = resolvedSearchParams.filter || [];
  const page = parseInt(resolvedSearchParams.page || "1");
  const limit = parseInt(resolvedSearchParams.limit || "10");

  const activityData = await api.users.getTutorActivityData({
    search,
    filter,
    page,
    limit,
  });

  if (!activityData?.success || !activityData.data) {
    return <div>Failed to load activity data or access denied.</div>;
  }

  const { users, totalItems, activeCount } = activityData.data;

  return (
    <UserCards data={users} totalItems={totalItems} activeCount={activeCount} />
  );
}
