import Community from "./_components/CommunityPage";
import { api } from "@/trpc/server";

export default async function CommunityPage() {
  const doubtsData = await api.doubts.getEnrolledCoursesDoubts();

  if (!doubtsData?.success || !doubtsData.data) {
    return <div>No community data available</div>;
  }

  const allDoubts = doubtsData.data;

  return (
    <main className="mx-auto flex w-full max-w-screen-xl flex-col items-center justify-center p-4 sm:px-6 lg:px-12">
      <Community allDoubts={allDoubts} />
    </main>
  );
}
