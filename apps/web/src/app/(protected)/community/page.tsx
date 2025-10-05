import Community from "./_components/CommunityPage";
import { api } from "@/trpc/server";

export default async function CommunityPage() {
  const doubtsData = await api.doubts.getEnrolledCoursesDoubts();

  if (!doubtsData?.success || !doubtsData.data) {
    return <div>No community data available</div>;
  }

  const allDoubts = doubtsData.data;

  return (
    <Community allDoubts={allDoubts} />
  );
}
