"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpenText,
  CalendarDays,
  Check,
  ChevronDown,
  Layers,
  Link2,
  ListChecks,
  MessagesSquare,
  MonitorPlay,
  NotebookPen,
  PenSquare,
  Play,
  Radio,
  Sparkles,
  UserCheck,
  UserX,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { SessionUser } from "@/lib/auth";
import { Badge } from "@tutly/ui/badge";
import { Button } from "@tutly/ui/button";
import { Skeleton } from "@tutly/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tutly/ui/tooltip";
import { cn } from "@tutly/utils";
import { api } from "@/trpc/react";

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

type ClassRow = {
  kind: "class";
  id: string;
  title: string;
  classType: "RECORDED" | "LIVE";
  liveStatus: "live" | "upcoming" | null;
  href: string;
  createdAt: Date;
  folderId: string | null;
  attended: boolean | null;
  attendedDuration: number | null;
};

type AssignmentRow = {
  kind: "assignment";
  id: string;
  title: string;
  href: string;
  dueDate: Date | null;
  hasLink: boolean;
  submitted: boolean;
  createdAt: Date;
  classId: string | null;
  folderId: string | null;
};

type Row = ClassRow | AssignmentRow;

type FolderGroup = {
  id: string;
  title: string;
  rows: Row[];
};

export default function CourseDetailsClient({
  user,
  courseId,
}: {
  user: SessionUser;
  courseId: string;
}) {
  const router = useRouter();
  const isStudent = user.role === "STUDENT";

  const { data: courseResp, isLoading: courseLoading } =
    api.courses.getCourseByCourseId.useQuery({ id: courseId });
  const { data: classesResp, isLoading: classesLoading } =
    api.classes.getClassesByCourseId.useQuery({ courseId });
  const { data: assignmentsResp, isLoading: assignmentsLoading } =
    api.attachments.getCourseAssignments.useQuery({ courseId });
  const { data: courseGroup } = api.chat.getCourseGroup.useQuery({ courseId });
  const { data: attendanceResp } =
    api.attendances.getMyCourseAttendance.useQuery(
      { courseId },
      { enabled: isStudent },
    );

  const attendanceMap = useMemo(() => {
    const m = new Map<string, { attended: boolean; duration: number | null }>();
    const records = attendanceResp?.data ?? [];
    records.forEach(
      (r: {
        classId: string;
        attended: boolean;
        attendedDuration: number | null;
      }) => {
        m.set(r.classId, {
          attended: r.attended,
          duration: r.attendedDuration ?? null,
        });
      },
    );
    return m;
  }, [attendanceResp]);

  const course = courseResp?.data;
  const classes = useMemo(() => classesResp?.data ?? [], [classesResp]);
  const assignments = useMemo(
    () => assignmentsResp?.data ?? [],
    [assignmentsResp],
  );

  const isLoading = courseLoading || classesLoading || assignmentsLoading;

  const { groups, totalAssignments, submittedAssignments } = useMemo(() => {
    const classRows: ClassRow[] = classes.map((c) => {
      const ct = (c as any).classType as "RECORDED" | "LIVE" | undefined;
      let liveStatus: ClassRow["liveStatus"] = null;
      if (ct === "LIVE") {
        const now = new Date();
        const start = (c as any).startTime
          ? new Date((c as any).startTime)
          : null;
        const end = (c as any).endTime ? new Date((c as any).endTime) : null;
        if (start && end && now >= start && now <= end) liveStatus = "live";
        else if (start && now < start) liveStatus = "upcoming";
      }
      const att = attendanceMap.get(c.id);
      return {
        kind: "class",
        id: c.id,
        title: c.title,
        classType: ct ?? "RECORDED",
        liveStatus,
        href: `/courses/class?id=${courseId}&classId=${c.id}`,
        createdAt: new Date(c.createdAt as unknown as string),
        folderId: c.folderId ?? null,
        attended: att ? att.attended : null,
        attendedDuration: att?.duration ?? null,
      };
    });

    const assignmentRows: AssignmentRow[] = assignments.map((a) => {
      const cls = a.classId ? classes.find((c) => c.id === a.classId) : null;
      return {
        kind: "assignment",
        id: a.id,
        title: a.title,
        href: `/assignments/detail?id=${a.id}`,
        dueDate: a.dueDate ? new Date(a.dueDate as unknown as string) : null,
        hasLink: Boolean(a.link),
        submitted: isStudent && a.submissions.length > 0,
        createdAt: new Date(a.createdAt as unknown as string),
        classId: a.classId ?? null,
        folderId: cls?.folderId ?? null,
      };
    });

    const totalSubmitted = isStudent
      ? assignmentRows.filter((a) => a.submitted).length
      : 0;

    // Build folder groups in the order folders first appear among classes
    const folderOrder: string[] = [];
    const folderTitles = new Map<string, string>();
    classes.forEach((c) => {
      if (c.folderId && !folderOrder.includes(c.folderId)) {
        folderOrder.push(c.folderId);
        folderTitles.set(c.folderId, c.Folder?.title ?? "Folder");
      }
    });

    const folderGroups: FolderGroup[] = folderOrder.map((fid) => {
      const folderClasses = classRows
        .filter((c) => c.folderId === fid)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const rows: Row[] = [];
      folderClasses.forEach((c) => {
        rows.push(c);
        const linkedAssignments = assignmentRows
          .filter((a) => a.classId === c.id)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        rows.push(...linkedAssignments);
      });
      const orphanFolderAssignments = assignmentRows
        .filter((a) => a.folderId === fid && !a.classId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      rows.push(...orphanFolderAssignments);
      return {
        id: fid,
        title: folderTitles.get(fid) ?? "Folder",
        rows,
      };
    });

    // Classes without a folder
    const unfolderedClasses = classRows.filter((c) => !c.folderId);
    const unfolderedRows: Row[] = [];
    unfolderedClasses
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .forEach((c) => {
        unfolderedRows.push(c);
        const linked = assignmentRows
          .filter((a) => a.classId === c.id)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        unfolderedRows.push(...linked);
      });
    if (unfolderedRows.length > 0) {
      folderGroups.unshift({
        id: "__unfoldered__",
        title: "Lessons",
        rows: unfolderedRows,
      });
    }

    // Course-level assignments (no class, no folder)
    const courseLevelAssignments = assignmentRows
      .filter((a) => !a.classId && !a.folderId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (courseLevelAssignments.length > 0) {
      folderGroups.push({
        id: "__course_assignments__",
        title: "Course Assignments",
        rows: courseLevelAssignments,
      });
    }

    return {
      groups: folderGroups,
      totalAssignments: assignmentRows.length,
      submittedAssignments: totalSubmitted,
    };
  }, [classes, assignments, courseId, isStudent, attendanceMap]);

  const totalClasses = classes.length;
  const progressPct = isStudent
    ? totalAssignments === 0
      ? 0
      : Math.round((submittedAssignments / totalAssignments) * 100)
    : 0;

  // Continue takes the student to the most recent class
  const continueHref = useMemo(() => {
    let last: { href: string; createdAt: Date } | null = null;
    for (const g of groups) {
      for (const r of g.rows) {
        if (r.kind === "class") {
          if (!last || r.createdAt > last.createdAt)
            last = { href: r.href, createdAt: r.createdAt };
        }
      }
    }
    return last?.href ?? null;
  }, [groups]);

  const firstClassHref = useMemo(() => {
    for (const g of groups) {
      for (const r of g.rows) {
        if (r.kind === "class") return r.href;
      }
    }
    return null;
  }, [groups]);

  const allAssignmentsHref =
    totalAssignments > 0 ? `/assignments?course=${courseId}` : null;
  const submittedAssignmentsHref =
    isStudent && totalAssignments > 0
      ? `/assignments?course=${courseId}&filter=submitted`
      : null;

  return (
    <div className="bg-background min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]">
      <div className="border-border/60 border-b">
        <div className="mx-auto w-full max-w-7xl px-4 pt-5 pb-3 sm:px-6">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to courses
          </button>
        </div>
        <div className="mx-auto w-full max-w-7xl px-4 pt-2 pb-8 sm:px-6 sm:pt-4 sm:pb-10">
          <CourseHero
            course={course}
            loading={courseLoading}
            totalClasses={totalClasses}
            totalAssignments={totalAssignments}
            isStudent={isStudent}
            progressPct={progressPct}
            submitted={submittedAssignments}
            continueHref={continueHref}
            lessonsHref={firstClassHref}
            assignmentsHref={allAssignmentsHref}
            submittedHref={submittedAssignmentsHref}
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px]">
          <main className="min-w-0 space-y-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-foreground text-lg font-semibold tracking-tight sm:text-xl">
                  Course content
                </h2>
                <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
                  {totalClasses} {totalClasses === 1 ? "lesson" : "lessons"}
                  {" · "}
                  {totalAssignments}{" "}
                  {totalAssignments === 1 ? "assignment" : "assignments"}
                </p>
              </div>
            </div>

            {isLoading && <ContentSkeleton />}

            {!isLoading && groups.length === 0 && (
              <EmptyState />
            )}

            {!isLoading && groups.length > 0 && (
              <div className="space-y-3">
                {groups.map((g, idx) => (
                  <FolderSection
                    key={g.id}
                    group={g}
                    isStudent={isStudent}
                    defaultOpen={idx === 0}
                  />
                ))}
              </div>
            )}
          </main>

          <aside className="space-y-4">
            <SummaryCard
              totalClasses={totalClasses}
              totalAssignments={totalAssignments}
              isStudent={isStudent}
              submittedAssignments={submittedAssignments}
              progressPct={progressPct}
              startDate={course?.startDate ?? null}
              endDate={course?.endDate ?? null}
            />
            {courseGroup && (
              <Link
                href={`/community?g=${courseGroup.groupId}`}
                className="bg-card hover:border-sky-500/40 hover:bg-sky-500/5 group block rounded-xl border p-4 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300">
                    <MessagesSquare className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm font-semibold">
                      Course discussion
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Ask questions, share progress
                    </p>
                  </div>
                  <ArrowRight className="text-muted-foreground group-hover:text-foreground mt-1 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            )}
            <AwardCard isStudent={isStudent} progressPct={progressPct} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function CourseHero({
  course,
  loading,
  totalClasses,
  totalAssignments,
  isStudent,
  progressPct,
  submitted,
  continueHref,
  lessonsHref,
  assignmentsHref,
  submittedHref,
}: {
  course:
    | { title: string; image: string | null; slug: string | null }
    | null
    | undefined;
  loading: boolean;
  totalClasses: number;
  totalAssignments: number;
  isStudent: boolean;
  progressPct: number;
  submitted: number;
  continueHref: string | null;
  lessonsHref: string | null;
  assignmentsHref: string | null;
  submittedHref: string | null;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <Skeleton className="h-20 w-20 shrink-0 rounded-2xl sm:h-24 sm:w-24" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="from-primary/15 to-primary/5 ring-primary/15 relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br shadow-sm ring-1 sm:h-24 sm:w-24">
        {course?.image ? (
          <Image
            src={course.image}
            alt={course.title}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <BookOpenText className="text-primary h-9 w-9 sm:h-11 sm:w-11" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          Course
        </div>
        <h1 className="text-foreground mt-1 text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
          {course?.title ?? "Course"}
        </h1>
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm">
          <StatLink href={lessonsHref}>
            <MonitorPlay className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            {totalClasses} {totalClasses === 1 ? "lesson" : "lessons"}
          </StatLink>
          <StatLink href={assignmentsHref}>
            <NotebookPen className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
            {totalAssignments}{" "}
            {totalAssignments === 1 ? "assignment" : "assignments"}
          </StatLink>
          {isStudent && totalAssignments > 0 && (
            <StatLink href={submittedHref}>
              <ListChecks className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
              {submitted}/{totalAssignments} submitted
            </StatLink>
          )}
        </div>
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:items-end">
        {continueHref && (
          <Button asChild size="lg" className="gap-2 shadow-sm">
            <Link href={continueHref}>
              <Play className="h-4 w-4 fill-current" />
              {isStudent && submitted > 0 ? "Continue" : "Start learning"}
            </Link>
          </Button>
        )}
        {isStudent && totalAssignments > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <div className="bg-muted relative h-1.5 w-32 overflow-hidden rounded-full">
              <div
                className="bg-primary absolute inset-y-0 left-0 rounded-full transition-[width]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-muted-foreground tabular-nums">
              {progressPct}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatLink({
  href,
  children,
}: {
  href: string | null;
  children: ReactNode;
}) {
  if (!href) {
    return (
      <span className="inline-flex items-center gap-1.5">{children}</span>
    );
  }
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-foreground inline-flex items-center gap-1.5 transition-colors hover:underline hover:underline-offset-4"
    >
      {children}
    </Link>
  );
}

function FolderSection({
  group,
  isStudent,
  defaultOpen,
}: {
  group: FolderGroup;
  isStudent: boolean;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const total = group.rows.length;
  const completed = isStudent
    ? group.rows.filter((r) => r.kind === "assignment" && r.submitted).length
    : 0;
  const totalAssignmentsInGroup = group.rows.filter(
    (r) => r.kind === "assignment",
  ).length;

  return (
    <section className="bg-card overflow-hidden rounded-xl border shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hover:bg-accent/30 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors sm:px-5"
      >
        <ChevronDown
          className={cn(
            "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
            !open && "-rotate-90",
          )}
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-foreground text-sm font-semibold sm:text-base">
            {group.title}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-[11px] sm:text-xs">
            {total} {total === 1 ? "item" : "items"}
            {isStudent && totalAssignmentsInGroup > 0 && (
              <>
                {" · "}
                {completed}/{totalAssignmentsInGroup} done
              </>
            )}
          </p>
        </div>
        {isStudent && totalAssignmentsInGroup > 0 && (
          <div className="hidden sm:block">
            <div className="bg-muted relative h-1 w-24 overflow-hidden rounded-full">
              <div
                className="bg-primary absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${
                    totalAssignmentsInGroup === 0
                      ? 0
                      : (completed / totalAssignmentsInGroup) * 100
                  }%`,
                }}
              />
            </div>
          </div>
        )}
      </button>
      {open && (
        <ul className="border-t">
          {group.rows.map((row, i) => (
            <ItemRow
              key={`${row.kind}-${row.id}`}
              row={row}
              index={i + 1}
              isStudent={isStudent}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ItemRow({
  row,
  index,
  isStudent,
}: {
  row: Row;
  index: number;
  isStudent: boolean;
}) {
  const isAssignment = row.kind === "assignment";
  const isComplete = isAssignment && (row as AssignmentRow).submitted;

  return (
    <li>
      <Link
        href={row.href}
        className={cn(
          "group flex items-center gap-3 px-4 py-3 transition-colors sm:gap-4 sm:px-5",
          "hover:bg-accent/40 border-b last:border-b-0",
        )}
      >
        <div className="text-muted-foreground/70 hidden w-5 shrink-0 text-right text-[11px] tabular-nums sm:block">
          {index}
        </div>

        <StatusIndicator
          kind={row.kind}
          complete={isComplete}
          live={row.kind === "class" ? row.liveStatus : null}
          isStudent={isStudent}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-foreground line-clamp-1 text-sm font-medium sm:text-[0.95rem]",
                isComplete && "text-muted-foreground line-through",
              )}
            >
              {row.title}
            </span>
            {row.kind === "class" && row.liveStatus === "live" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                LIVE
              </span>
            )}
          </div>
          <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] sm:text-xs">
            {row.kind === "class" ? (
              <>
                <span className="inline-flex items-center gap-1">
                  {row.classType === "LIVE" ? (
                    <Radio className="h-3 w-3 text-rose-500" />
                  ) : (
                    <MonitorPlay className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                  )}
                  {row.classType === "LIVE" ? "Live class" : "Recorded lesson"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3 text-muted-foreground/70" />
                  {row.createdAt.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {isStudent && row.attended === true && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <UserCheck className="h-3 w-3" />
                    {row.attendedDuration && row.attendedDuration > 0
                      ? `Attended · ${formatDuration(row.attendedDuration)}`
                      : "Attended"}
                  </span>
                )}
                {isStudent && row.attended === false && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-help items-center gap-1 text-rose-600 dark:text-rose-400">
                          <UserX className="h-3 w-3" />
                          {row.attendedDuration && row.attendedDuration > 0
                            ? `Absent · ${formatDuration(row.attendedDuration)}`
                            : "Absent"}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {row.attendedDuration && row.attendedDuration > 0
                            ? "Joined briefly but below the minimum attendance criteria set by the instructor"
                            : "You did not join this class"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1">
                  <NotebookPen className="h-3 w-3 text-violet-500 dark:text-violet-400" />
                  Assignment
                </span>
                {row.dueDate && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 text-amber-500" />
                    Due{" "}
                    {row.dueDate.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
                {row.hasLink && (
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="h-3 w-3 text-sky-500" />
                    External link
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 sm:block">
          {row.kind === "class" ? (
            <Badge
              variant="outline"
              className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
            >
              Class
            </Badge>
          ) : isStudent ? (
            <Badge
              variant="outline"
              className={cn(
                isComplete
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
              )}
            >
              {isComplete ? "Submitted" : "Pending"}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
            >
              Assignment
            </Badge>
          )}
        </div>

        <ArrowRight className="text-muted-foreground/0 group-hover:text-muted-foreground hidden h-4 w-4 shrink-0 transition-all group-hover:translate-x-0.5 sm:block" />
      </Link>
    </li>
  );
}

function StatusIndicator({
  kind,
  complete,
  live,
  isStudent,
}: {
  kind: "class" | "assignment";
  complete: boolean;
  live: "live" | "upcoming" | null;
  isStudent: boolean;
}) {
  if (kind === "class") {
    if (live === "live") {
      return (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/15 text-rose-600 shadow-sm shadow-rose-500/10 dark:text-rose-400">
          <Radio className="h-3.5 w-3.5" />
        </div>
      );
    }
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 shadow-sm shadow-indigo-500/10 dark:text-indigo-300">
        <MonitorPlay className="h-3.5 w-3.5" />
      </div>
    );
  }
  if (!isStudent) {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-600 shadow-sm shadow-violet-500/10 dark:text-violet-300">
        <PenSquare className="h-3.5 w-3.5" />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "group/cb mx-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all",
        complete
          ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
          : "border-muted-foreground/40 bg-background hover:border-emerald-500/60 hover:bg-emerald-500/5",
      )}
      aria-hidden
    >
      <Check
        className={cn(
          "h-2.5 w-2.5 transition-all",
          complete ? "scale-100 opacity-100" : "scale-50 opacity-0",
        )}
        strokeWidth={3.5}
      />
    </div>
  );
}

function SummaryCard({
  totalClasses,
  totalAssignments,
  isStudent,
  submittedAssignments,
  progressPct,
  startDate,
  endDate,
}: {
  totalClasses: number;
  totalAssignments: number;
  isStudent: boolean;
  submittedAssignments: number;
  progressPct: number;
  startDate: Date | string | null;
  endDate: Date | string | null;
}) {
  const fmt = (d: Date | string | null) =>
    d
      ? new Date(d).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;
  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary h-4 w-4" />
        <h3 className="text-foreground text-sm font-semibold">Summary</h3>
      </div>
      <div className="mt-3 space-y-2.5 text-xs sm:text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Lessons</span>
          <span className="text-foreground font-semibold tabular-nums">
            {totalClasses}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Assignments</span>
          <span className="text-foreground font-semibold tabular-nums">
            {totalAssignments}
          </span>
        </div>
        {isStudent && totalAssignments > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Completed</span>
            <span className="text-foreground font-semibold tabular-nums">
              {submittedAssignments}/{totalAssignments}
            </span>
          </div>
        )}
        {fmt(startDate) && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Started</span>
            <span className="text-foreground font-medium">
              {fmt(startDate)}
            </span>
          </div>
        )}
        {fmt(endDate) && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Ends</span>
            <span className="text-foreground font-medium">{fmt(endDate)}</span>
          </div>
        )}
      </div>
      {isStudent && totalAssignments > 0 && (
        <div className="mt-4">
          <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-[11px]">
            <span>Progress</span>
            <span className="tabular-nums">{progressPct}%</span>
          </div>
          <div className="bg-muted relative h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary absolute inset-y-0 left-0 rounded-full transition-[width]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AwardCard({
  isStudent,
  progressPct,
}: {
  isStudent: boolean;
  progressPct: number;
}) {
  if (!isStudent) return null;
  const earned = progressPct >= 100;
  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-amber-500" />
        <h3 className="text-foreground text-sm font-semibold">Award</h3>
      </div>
      <div className="mt-3 flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors",
            earned
              ? "border-amber-500/40 bg-linear-to-br from-amber-400/20 to-amber-500/10 text-amber-600 shadow-sm shadow-amber-500/20 dark:text-amber-400"
              : "border-muted-foreground/20 bg-muted text-muted-foreground/70",
          )}
        >
          <Award className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm font-semibold">
            {earned ? "Course complete" : "Course completion"}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {earned
              ? "Nice work — every assignment submitted."
              : "Submit every assignment to unlock the badge."}
          </p>
        </div>
      </div>
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((s) => (
        <div key={s} className="bg-card overflow-hidden rounded-xl border">
          <div className="flex items-center gap-3 px-5 py-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="border-t">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b px-5 py-3 last:border-b-0"
              >
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-2 w-1/3" />
                </div>
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-card rounded-xl border p-10 text-center shadow-sm">
      <div className="bg-primary/5 text-primary border-primary/15 mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border">
        <Layers className="h-5 w-5" />
      </div>
      <p className="text-foreground mt-3 text-base font-semibold">
        Nothing here yet
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        Lessons and assignments will appear here once they&apos;re added.
      </p>
    </div>
  );
}
