"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  ExternalLink,
  Eye,
  FileCode2,
  GitBranch,
  Globe,
  Mail,
  Sparkles,
  Terminal,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@tutly/ui/badge";
import { Button } from "@tutly/ui/button";
import { ScrollArea, ScrollBar } from "@tutly/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tutly/ui/select";
import NoDataFound from "@/components/NoDataFound";
import { UserLink } from "@/components/UserLink";
import { cn } from "@tutly/utils";

type SubmissionMode =
  | "HTML_CSS_JS"
  | "REACT"
  | "EXTERNAL_LINK"
  | "SANDBOX"
  | "WORKSPACE"
  | "GIT";

const MODE_META: Record<
  SubmissionMode,
  {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    text: string;
  }
> = {
  HTML_CSS_JS: {
    label: "HTML / CSS / JS",
    Icon: Globe,
    text: "text-orange-600 dark:text-orange-400",
  },
  REACT: {
    label: "React",
    Icon: Sparkles,
    text: "text-sky-600 dark:text-sky-400",
  },
  EXTERNAL_LINK: {
    label: "External link",
    Icon: ExternalLink,
    text: "text-violet-600 dark:text-violet-400",
  },
  SANDBOX: {
    label: "Sandbox",
    Icon: FileCode2,
    text: "text-emerald-600 dark:text-emerald-400",
  },
  WORKSPACE: {
    label: "Workspace",
    Icon: Terminal,
    text: "text-indigo-600 dark:text-indigo-400",
  },
  GIT: {
    label: "Git",
    Icon: GitBranch,
    text: "text-rose-600 dark:text-rose-400",
  },
};

function getModeMeta(mode?: string) {
  if (mode && mode in MODE_META) return MODE_META[mode as SubmissionMode];
  return {
    label: "Assignment",
    Icon: Code2,
    text: "text-muted-foreground",
  };
}

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/40 mx-2 select-none">
      ·
    </span>
  );
}

type SimpleCourse = { id: string; title: string };

type Student = {
  username: string;
  name: string;
  image: string | null;
  email: string | null;
};

export default function StudentWiseAssignments({
  courses,
  assignments,
  userId,
  student,
}: {
  courses: SimpleCourse[];
  assignments: any[];
  userId: string;
  student?: Student | null;
}) {
  const router = useRouter();
  const [currentCourse, setCurrentCourse] = useState<string>(
    courses[0]?.id || "",
  );
  const [filterOption, setFilterOption] = useState<string>("all");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  const allAttachments = useMemo(() => {
    if (!Array.isArray(assignments)) return [] as any[];
    return assignments.flatMap((course: any) => {
      const courseClasses = course.classes ?? [];
      return courseClasses.flatMap((cls: any) =>
        (cls.attachments ?? []).map((a: any) => ({
          ...a,
          _courseId: course.id,
        })),
      );
    });
  }, [assignments]);

  const visibleAttachments = useMemo(() => {
    const inCourse = allAttachments.filter(
      (a: any) => a._courseId === currentCourse,
    );
    return inCourse.filter((assignment: any) => {
      if (filterOption === "all") return true;
      if (filterOption === "not-submitted")
        return assignment.submissions.length === 0;
      if (filterOption === "submitted")
        return assignment.submissions.length > 0;
      if (filterOption === "unreviewed") {
        return (
          assignment.submissions.length > 0 &&
          assignment.submissions.some((x: any) => x.points.length === 0)
        );
      }
      if (filterOption === "reviewed") {
        return (
          assignment.submissions.length > 0 &&
          assignment.submissions.some((x: any) => x.points.length > 0)
        );
      }
      return true;
    });
  }, [allAttachments, currentCourse, filterOption]);

  const aggregate = useMemo(() => {
    const courseAttachments = allAttachments.filter(
      (a: any) => a._courseId === currentCourse,
    );
    const total = courseAttachments.length;
    const submitted = courseAttachments.filter(
      (a: any) => a.submissions.length > 0,
    ).length;
    const reviewed = courseAttachments.filter((a: any) =>
      a.submissions.some((s: any) => s.points.length > 0),
    ).length;
    return { total, submitted, reviewed };
  }, [allAttachments, currentCourse]);

  if (!isMounted) return null;

  const filterOptions = [
    { value: "all", label: "All", icon: Eye },
    { value: "submitted", label: "Submitted", icon: CheckCircle2 },
    { value: "reviewed", label: "Reviewed", icon: CheckCircle },
    { value: "unreviewed", label: "Unreviewed", icon: Clock },
    { value: "not-submitted", label: "Not submitted", icon: XCircle },
  ];

  const goToDetail = (assignmentId: string) => {
    router.push(`/assignments/detail?id=${assignmentId}&username=${userId}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-5">
      {/* Hero band */}
      <div className="bg-card relative overflow-hidden rounded-2xl border p-5 shadow-sm sm:p-6">
        <div className="bg-linear-to-br pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full from-emerald-500/10 via-sky-500/10 to-transparent blur-2xl" />
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-4">
              <Link
                href="/tutor/assignments/submissions"
                className="hover:bg-accent text-muted-foreground hover:text-foreground hidden h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors sm:inline-flex"
                aria-label="Back to submissions"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              {student && (
                <UserLink username={student.username} stopPropagation>
                  <Image
                    src={student.image || "/placeholder.jpg"}
                    width={56}
                    height={56}
                    alt={student.name}
                    className="bg-muted h-14 w-14 shrink-0 rounded-full object-cover transition-opacity hover:opacity-80"
                  />
                </UserLink>
              )}
              <div className="min-w-0">
                <div className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase">
                  <Users className="h-3.5 w-3.5 text-emerald-500" />
                  Student
                </div>
                <h1 className="text-foreground mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">
                  {student?.name ?? userId}
                </h1>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center text-[12px]">
                  <span className="inline-flex items-center gap-1">
                    @{student?.username ?? userId}
                  </span>
                  {student?.email && (
                    <>
                      <Dot />
                      <a
                        href={`mailto:${student.email}`}
                        className="inline-flex items-center gap-1 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-3 w-3" />
                        {student.email}
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0 sm:hidden">
              <Select value={currentCourse} onValueChange={setCurrentCourse}>
                <SelectTrigger
                  size="sm"
                  className="bg-background h-9 max-w-40 rounded-full"
                >
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent align="end">
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {aggregate.total > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="bg-muted/60 text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium">
                <CheckCircle className="h-3 w-3 text-emerald-500" />
                <span className="text-foreground">{aggregate.reviewed}</span>{" "}
                reviewed
              </span>
              <span className="bg-muted/60 text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium">
                <CheckCircle2 className="h-3 w-3 text-sky-500" />
                <span className="text-foreground">{aggregate.submitted}</span>/
                {aggregate.total} submitted
              </span>
              <span className="bg-muted/60 text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium">
                <XCircle className="h-3 w-3 text-rose-500" />
                <span className="text-foreground">
                  {aggregate.total - aggregate.submitted}
                </span>{" "}
                not submitted
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Course chips + filter chips */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <ScrollArea className="-mx-3 hidden min-w-0 flex-1 sm:mx-0 sm:block">
          <div className="flex gap-2 px-3 pb-1 sm:px-0">
            {courses.map((course) => (
              <Button
                key={course.id}
                variant={currentCourse === course.id ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentCourse(course.id)}
                className="h-8 shrink-0 rounded-full whitespace-nowrap"
              >
                {course.title}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>

        <ScrollArea className="-mx-3 sm:mx-0 sm:shrink-0">
          <div className="bg-muted/40 mx-3 inline-flex items-center gap-1 rounded-full p-1 sm:mx-0">
            {filterOptions.map((option) => {
              const Icon = option.icon;
              const active = filterOption === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setFilterOption(option.value)}
                  className={cn(
                    "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/70 hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      {/* List */}
      {visibleAttachments.length === 0 ? (
        <div className="bg-card rounded-xl border py-12 shadow-sm">
          <NoDataFound message="No assignments found" />
        </div>
      ) : (
        <ul className="bg-card divide-border divide-y overflow-hidden rounded-xl border shadow-sm">
          {visibleAttachments.map((assignment: any) => {
            const meta = getModeMeta(assignment.submissionMode);
            const Icon = meta.Icon;
            const dueDate = assignment.dueDate
              ? new Date(assignment.dueDate)
              : null;
            const isPastDue = dueDate ? dueDate.getTime() < Date.now() : false;
            return (
              <li key={assignment.id}>
                <button
                  type="button"
                  onClick={() => goToDetail(assignment.id)}
                  className="hover:bg-accent/40 flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors sm:gap-4 sm:px-5 sm:py-3.5"
                >
                  <div
                    className="bg-muted/60 text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                    aria-hidden
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-foreground truncate text-sm font-medium sm:text-[15px]">
                      {assignment.title}
                    </h4>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center text-[11px]">
                      <span className={cn("font-medium", meta.text)}>
                        {meta.label}
                      </span>
                      {assignment.class?.title && (
                        <>
                          <Dot />
                          <span className="inline-flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {assignment.class.title}
                          </span>
                        </>
                      )}
                      {dueDate && (
                        <>
                          <Dot />
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              isPastDue && "text-rose-600 dark:text-rose-400",
                            )}
                          >
                            <CalendarDays className="h-3 w-3" />
                            {isPastDue ? "Was due " : "Due "}
                            {dueDate.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {assignment.submissions.length === 0 ? (
                      <Badge
                        variant="destructive"
                        className="h-6 gap-1 rounded-full text-[11px]"
                      >
                        <XCircle className="h-3 w-3" />
                        Not submitted
                      </Badge>
                    ) : (
                      assignment.submissions.map(
                        (submission: any, index: number) => {
                          if (submission.points.length === 0) {
                            return (
                              <Badge
                                key={index}
                                className="h-6 gap-1 rounded-full bg-amber-500 text-[11px] text-white hover:bg-amber-600"
                              >
                                <Clock className="h-3 w-3" />
                                Under review
                              </Badge>
                            );
                          }
                          const total = submission.points.reduce(
                            (sum: number, point: any) =>
                              sum + (point.score || 0),
                            0,
                          );
                          return (
                            <Badge
                              key={index}
                              className="h-6 gap-1 rounded-full bg-emerald-500 text-[11px] text-white hover:bg-emerald-600"
                            >
                              <Trophy className="h-3 w-3" />
                              Score: {total}
                            </Badge>
                          );
                        },
                      )
                    )}
                  </div>
                  <ChevronRight className="text-muted-foreground/60 h-5 w-5 shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
