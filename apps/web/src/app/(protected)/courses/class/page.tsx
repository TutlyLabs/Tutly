"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { Navigate } from "@/components/auth/Navigate";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import { FullPageSpinnerSkeleton } from "@/components/loader/Skeletons";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@tutly/ui/sheet";
import { useIsMobile } from "@tutly/hooks";
import { PageLayout } from "@/components/PageLayout";

import ClassSidebar from "./_components/classSidebar";
import Class from "./_components/Class";

export default function ClassPage() {
  const { user } = useAuthSession();
  const sp = useSearchParams();
  const id = sp.get("id");
  const classId = sp.get("classId");
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!user) return <FullPageSpinnerSkeleton />;
  if (!id || !classId) return <Navigate to="/courses" />;

  const isCourseAdmin = user.role === "INSTRUCTOR";

  return (
    <PageLayout forceClose className="!p-0">
      <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden sm:h-[calc(100vh-4rem)]">
        {!isMobile && (
          <ClassSidebar
            courseId={id}
            title="Assignments"
            currentUser={user}
            isCourseAdmin={isCourseAdmin}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="w-full p-4 sm:p-6 lg:px-8 xl:px-10">
              <Class
                key={classId}
                courseId={id}
                classId={classId}
                currentUser={user}
                onOpenClassMenu={
                  isMobile ? () => setSheetOpen(true) : undefined
                }
              />
            </div>
          </div>
        </div>
      </div>

      {isMobile && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="left"
            className="flex w-[85%] flex-col gap-0 p-0 sm:max-w-sm"
          >
            <SheetHeader className="border-b px-4 py-3">
              <SheetTitle className="text-base">Classes</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <ClassSidebar
                courseId={id}
                title="Assignments"
                currentUser={user}
                isCourseAdmin={isCourseAdmin}
                mobileFull
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </PageLayout>
  );
}
