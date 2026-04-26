"use client";

import { useSearchParams } from "next/navigation";

import { Navigate } from "@/components/auth/Navigate";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import ClassSidebar from "./_components/classSidebar";
import Class from "./_components/Class";
import { PageLayout } from "@/components/PageLayout";

export default function ClassPage() {
  const { user } = useAuthSession();
  const sp = useSearchParams();
  const id = sp.get("id");
  const classId = sp.get("classId");

  const notesQ = api.notes.getNote.useQuery(
    { userId: user?.id ?? "", objectId: classId ?? "" },
    { enabled: Boolean(user && classId) },
  );

  if (!user || notesQ.isLoading) return <PageLoader />;
  if (!id || !classId) return <Navigate to="/courses" />;

  return (
    <PageLayout forceClose>
      <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden">
        <ClassSidebar
          courseId={id}
          title="Assignments"
          currentUser={user}
          isCourseAdmin={user.role === "INSTRUCTOR"}
        />
        <div className="flex-1 overflow-y-auto">
          <div className="m-3">
            <Class
              courseId={id}
              classId={classId}
              currentUser={user}
              initialNotesData={notesQ.data}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
