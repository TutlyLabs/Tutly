import { getServerSession } from "@tutly/auth";
import { redirect } from "next/navigation";

import ClassSidebar from "./_components/classSidebar";

export default async function ClassesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user) return redirect("/sign-in");

  const { id } = await params;
  return (
    <div className="flex items-start w-full">
      <ClassSidebar
        courseId={id}
        title="Assignments"
        currentUser={session.user}
        isCourseAdmin={session.user.role === "INSTRUCTOR"}
      />
      <div className="w-full m-3">
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Select a class to view details</p>
        </div>
      </div>
    </div>
  );
} 