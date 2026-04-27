"use client";

import { useState } from "react";
import { ExternalLink, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import type { SessionUser } from "@/lib/auth";
import { Badge } from "@tutly/ui/badge";
import { Button } from "@tutly/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@tutly/ui/sheet";
import { Skeleton } from "@tutly/ui/skeleton";
import { useIsMobile } from "@tutly/hooks";
import { api } from "@/trpc/react";

import ClassSidebar from "../../class/_components/classSidebar";

export default function CourseDetailsClient({
  user,
  courseId,
}: {
  user: SessionUser;
  courseId: string;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data: assignmentsResponse, isLoading: assignmentsLoading } =
    api.attachments.getCourseAssignments.useQuery({ courseId });
  const assignments = assignmentsResponse?.data;

  if (!user) {
    router.push("/sign-in");
    return null;
  }

  const isCourseAdmin = user.role === "INSTRUCTOR";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden sm:h-[calc(100vh-4rem)]">
      {!isMobile && (
        <ClassSidebar
          courseId={courseId}
          title="Classes"
          currentUser={user}
          isCourseAdmin={isCourseAdmin}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {isMobile && (
          <div className="bg-background/85 supports-[backdrop-filter]:bg-background/65 sticky top-0 z-10 flex items-center justify-between gap-2 border-b px-3 py-2 backdrop-blur">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 cursor-pointer gap-1.5 px-2.5"
                  aria-label="Open class menu"
                >
                  <Menu className="h-4 w-4" />
                  Classes
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex w-[85%] flex-col gap-0 p-0 sm:max-w-sm"
              >
                <SheetHeader className="border-b px-4 py-3">
                  <SheetTitle className="text-base">Classes</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-hidden">
                  <ClassSidebar
                    courseId={courseId}
                    title="Classes"
                    currentUser={user}
                    isCourseAdmin={isCourseAdmin}
                    mobileFull
                  />
                </div>
              </SheetContent>
            </Sheet>
            <h2 className="text-foreground text-sm font-semibold">
              Assignments
            </h2>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl space-y-4 p-4 sm:p-6">
            {!isMobile && (
              <div>
                <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                  Assignments
                </h1>
                <p className="text-muted-foreground text-sm">
                  All assignments in this course.
                </p>
              </div>
            )}

            {assignmentsLoading && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-card rounded-xl border p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="mt-3 h-3 w-3/4" />
                    <Skeleton className="mt-2 h-3 w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {!assignmentsLoading && assignments?.length === 0 && (
              <div className="bg-card rounded-xl border p-8 text-center shadow-sm">
                <p className="text-foreground text-base font-semibold">
                  No assignments yet
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Assignments for this course will appear here.
                </p>
              </div>
            )}

            {!assignmentsLoading && assignments && assignments.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {assignments.map((attachment) => {
                  const submitted =
                    user.role === "STUDENT" &&
                    attachment.submissions.length !== 0;
                  return (
                    <Link
                      key={attachment.id}
                      href={`/assignments/detail?id=${attachment.id}`}
                      className="bg-card group flex flex-col gap-2 rounded-xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-foreground line-clamp-2 text-sm font-semibold">
                          {attachment.title}
                        </h3>
                        {user.role === "STUDENT" && (
                          <Badge
                            className={
                              submitted
                                ? "shrink-0 border-emerald-500/30 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                                : "shrink-0 border-rose-500/30 bg-rose-500/15 text-rose-700 hover:bg-rose-500/20 dark:text-rose-400"
                            }
                            variant="outline"
                          >
                            {submitted ? "Submitted" : "Pending"}
                          </Badge>
                        )}
                      </div>
                      {attachment.dueDate && (
                        <p className="text-muted-foreground text-[11px]">
                          Due{" "}
                          {new Date(attachment.dueDate).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </p>
                      )}
                      {attachment.link && (
                        <span
                          className="text-primary mt-auto inline-flex items-center gap-1 text-xs font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                          External link available
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
