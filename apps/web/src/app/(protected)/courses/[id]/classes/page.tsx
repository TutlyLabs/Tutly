import { getServerSession } from "@/lib/auth";
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
    <div className="flex w-full items-start">
      <ClassSidebar
        courseId={id}
        title="Assignments"
        currentUser={session.user}
        isCourseAdmin={session.user.role === "INSTRUCTOR"}
      />
      <div className="m-3 w-full">
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-500">Select a class to view details</p>
        </div>
      </div>
    </div>
  );
}
