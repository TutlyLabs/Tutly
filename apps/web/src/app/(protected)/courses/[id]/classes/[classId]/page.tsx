import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

import ClassSidebar from "../_components/classSidebar";
import Class from "../_components/Class";

export default async function ClassPage({
  params,
}: {
  params: Promise<{ id: string; classId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user) return redirect("/sign-in");

  const { id, classId } = await params;

  return (
    <div className="flex w-full items-start">
      <ClassSidebar
        courseId={id}
        title="Assignments"
        currentUser={session.user}
        isCourseAdmin={session.user.role === "INSTRUCTOR"}
      />
      <div className="m-3 w-full">
        <Class courseId={id} classId={classId} currentUser={session.user} />
      </div>
    </div>
  );
}
