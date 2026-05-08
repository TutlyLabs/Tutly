"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@tutly/ui/card";
import { Button } from "@tutly/ui/button";
import { Badge } from "@tutly/ui/badge";
import { ScrollArea, ScrollBar } from "@tutly/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@tutly/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tutly/ui/select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Eye,
  ExternalLink,
  FileCode2,
  GitBranch,
  Globe,
  Layers,
  Plus,
  Sparkles,
  Terminal,
  Trophy,
  XCircle,
} from "lucide-react";
import NoDataFound from "@/components/NoDataFound";
import NewAttachmentPage from "@/app/(protected)/courses/class/_components/NewAssignments";
import { cn } from "@tutly/utils";
import { useAuthSession } from "@/components/auth/ProtectedShell";

const FILTER_VALUES = new Set([
  "all",
  "reviewed",
  "unreviewed",
  "submitted",
  "not-submitted",
]);

const ALL_COURSES_VALUE = "__all__";

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
    short: string;
    Icon: React.ComponentType<{ className?: string }>;
    bg: string;
    text: string;
    ring: string;
  }
> = {
  HTML_CSS_JS: {
    label: "HTML / CSS / JS",
    short: "HTML/CSS",
    Icon: Globe,
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    ring: "ring-orange-500/20",
  },
  REACT: {
    label: "React",
    short: "React",
    Icon: Sparkles,
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    ring: "ring-sky-500/20",
  },
  EXTERNAL_LINK: {
    label: "External link",
    short: "Link",
    Icon: ExternalLink,
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-500/20",
  },
  SANDBOX: {
    label: "Sandbox",
    short: "Sandbox",
    Icon: FileCode2,
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/20",
  },
  WORKSPACE: {
    label: "Workspace",
    short: "Workspace",
    Icon: Terminal,
    bg: "bg-indigo-500/10",
    text: "text-indigo-600 dark:text-indigo-400",
    ring: "ring-indigo-500/20",
  },
  GIT: {
    label: "Git",
    short: "Git",
    Icon: GitBranch,
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    ring: "ring-rose-500/20",
  },
};

function getModeMeta(mode?: string) {
  if (mode && mode in MODE_META) return MODE_META[mode as SubmissionMode];
  return {
    label: "Assignment",
    short: "Other",
    Icon: Code2,
    bg: "bg-muted",
    text: "text-muted-foreground",
    ring: "ring-border",
  };
}

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/40 mx-2 select-none">
      ·
    </span>
  );
}

export default function AssignmentBoard({ courses, assignments, userId }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthSession();
  const isInstructor = user?.role === "INSTRUCTOR";
  const isStaff = user && user.role !== "STUDENT";
  const [createOpen, setCreateOpen] = useState(false);

  const courseParam = searchParams.get("course");
  const filterParam = searchParams.get("filter");

  const initialCourse =
    courseParam &&
    (courseParam === ALL_COURSES_VALUE ||
      courses?.some((c: any) => c.id === courseParam))
      ? courseParam
      : ALL_COURSES_VALUE;
  const initialFilter =
    filterParam && FILTER_VALUES.has(filterParam) ? filterParam : "all";

  const [currentCourse, setCurrentCourse] = useState<string>(initialCourse);
  const [filterOption, setFilterOption] = useState<string>(initialFilter);

  useEffect(() => {
    if (
      courseParam &&
      (courseParam === ALL_COURSES_VALUE ||
        courses?.some((c: any) => c.id === courseParam))
    ) {
      setCurrentCourse(courseParam);
    }
  }, [courseParam, courses]);

  useEffect(() => {
    if (filterParam && FILTER_VALUES.has(filterParam)) {
      setFilterOption(filterParam);
    }
  }, [filterParam]);

  const filterOptions = [
    { value: "all", label: "All", icon: Eye },
    { value: "submitted", label: "Submitted", icon: CheckCircle2 },
    { value: "reviewed", label: "Reviewed", icon: CheckCircle },
    { value: "unreviewed", label: "Unreviewed", icon: Clock },
    { value: "not-submitted", label: "Not submitted", icon: XCircle },
  ];

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

  const courseTitleById = useMemo(() => {
    const m = new Map<string, string>();
    (courses ?? []).forEach((c: any) => m.set(c.id, c.title));
    return m;
  }, [courses]);

  const visibleAttachments = useMemo(() => {
    const inCourse =
      currentCourse === ALL_COURSES_VALUE
        ? allAttachments
        : allAttachments.filter((a: any) => a._courseId === currentCourse);

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

  const modeBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    visibleAttachments.forEach((a: any) => {
      const key = a.submissionMode ?? "OTHER";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [visibleAttachments]);

  const updateCourse = (value: string) => {
    setCurrentCourse(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL_COURSES_VALUE) {
      params.delete("course");
    } else {
      params.set("course", value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const updateFilter = (value: string) => {
    setFilterOption(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("filter");
    } else {
      params.set("filter", value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const goToDetail = (assignmentId: string) => {
    const url = userId
      ? `/assignments/detail?id=${assignmentId}&username=${userId}`
      : `/assignments/detail?id=${assignmentId}`;
    router.push(url);
  };

  const courseChipOptions = [
    { id: ALL_COURSES_VALUE, title: "All courses" },
    ...(courses ?? []).map((c: any) => ({ id: c.id, title: c.title })),
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-5">
      {/* Hero band */}
      <div className="bg-card relative overflow-hidden rounded-2xl border p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-linear-to-br from-indigo-500/10 via-violet-500/10 to-transparent blur-2xl" />
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase">
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
                Assignments
              </div>
              <h1 className="text-foreground mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                {currentCourse === ALL_COURSES_VALUE
                  ? "All assignments"
                  : (courseTitleById.get(currentCourse) ?? "Assignments")}
              </h1>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {visibleAttachments.length}{" "}
                {visibleAttachments.length === 1 ? "assignment" : "assignments"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isInstructor && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                    className="hidden h-9 gap-1.5 rounded-full sm:inline-flex"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New assignment
                  </Button>
                  <Button
                    size="icon"
                    onClick={() => setCreateOpen(true)}
                    className="h-9 w-9 rounded-full sm:hidden"
                    aria-label="New assignment"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </>
              )}
              <div className="sm:hidden">
                <Select value={currentCourse} onValueChange={updateCourse}>
                  <SelectTrigger
                    size="sm"
                    className="bg-background h-9 max-w-[160px] rounded-full"
                  >
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {courseChipOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Mode breakdown chips */}
          {modeBreakdown.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {modeBreakdown.map(([mode, count]) => {
                const meta = getModeMeta(mode);
                const Icon = meta.Icon;
                return (
                  <span
                    key={mode}
                    className="bg-muted/60 text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                  >
                    <Icon className={cn("h-3 w-3", meta.text)} />
                    <span className="text-foreground">{count}</span>{" "}
                    {meta.short}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Course chips + filter chips */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <ScrollArea className="-mx-3 hidden min-w-0 flex-1 sm:mx-0 sm:block">
          <div className="flex gap-2 px-3 pb-1 sm:px-0">
            {courseChipOptions.map((course) => (
              <Button
                key={course.id}
                variant={currentCourse === course.id ? "default" : "outline"}
                size="sm"
                onClick={() => updateCourse(course.id)}
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
                  onClick={() => updateFilter(option.value)}
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
        <Card className="bg-card rounded-xl border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <NoDataFound message="No assignments found" />
          </CardContent>
        </Card>
      ) : null}
      {/* Create assignment dialog (instructor) */}
      {isInstructor && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="!max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create assignment</DialogTitle>
              <DialogDescription>
                Pre-create an assignment. You can link it to a class later from
                the class page.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] overflow-y-auto pr-2">
              <NewAttachmentPage
                classes={[]}
                courseId={
                  currentCourse !== ALL_COURSES_VALUE ? currentCourse : ""
                }
                classId=""
                onCancel={() => setCreateOpen(false)}
                onComplete={() => {
                  setCreateOpen(false);
                  router.refresh();
                }}
              />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {visibleAttachments.length > 0 && (
        <ul className="bg-card divide-border divide-y overflow-hidden rounded-xl border shadow-sm">
          {visibleAttachments.map((assignment: any) => {
            const meta = getModeMeta(assignment.submissionMode);
            const Icon = meta.Icon;
            const courseTitle = courseTitleById.get(assignment._courseId);
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
                      {currentCourse === ALL_COURSES_VALUE && courseTitle && (
                        <>
                          <Dot />
                          <span className="inline-flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {courseTitle}
                          </span>
                        </>
                      )}
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
                    {isStaff ? (
                      (() => {
                        const total = assignment.submissions.length;
                        const evaluated = assignment.submissions.filter(
                          (s: any) => s.points.length > 0,
                        ).length;
                        const underReview = total - evaluated;
                        return (
                          <>
                            <Badge className="h-6 gap-1 rounded-full bg-emerald-500/15 text-[11px] font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400">
                              <CheckCircle className="h-3 w-3" />
                              {evaluated} evaluated
                            </Badge>
                            {underReview > 0 && (
                              <Badge className="h-6 gap-1 rounded-full bg-amber-500/15 text-[11px] font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-400">
                                <Clock className="h-3 w-3" />
                                {underReview} under review
                              </Badge>
                            )}
                            <Badge className="bg-muted text-muted-foreground hover:bg-muted/80 h-6 gap-1 rounded-full text-[11px] font-medium">
                              {total}{" "}
                              {total === 1 ? "submission" : "submissions"}
                            </Badge>
                          </>
                        );
                      })()
                    ) : assignment.submissions.length === 0 ? (
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
                          const isClickable =
                            (pathname.startsWith("/mentor/") ||
                              pathname.startsWith("/instructor/")) &&
                            submission.submissionLink;

                          if (submission.points.length === 0) {
                            return (
                              <Badge
                                key={index}
                                className="h-6 gap-1 rounded-full bg-amber-500 text-[11px] text-white hover:bg-amber-600"
                                onClick={(e) => {
                                  if (isClickable) {
                                    e.stopPropagation();
                                    router.push(submission.submissionLink);
                                  }
                                }}
                              >
                                <Clock className="h-3 w-3" />
                                Under review
                              </Badge>
                            );
                          }
                          const total = submission.points.reduce(
                            (sum: number, point: any) => sum + point.score,
                            0,
                          );
                          return (
                            <Badge
                              key={index}
                              className="h-6 gap-1 rounded-full bg-emerald-500 text-[11px] text-white hover:bg-emerald-600"
                              onClick={(e) => {
                                if (isClickable) {
                                  e.stopPropagation();
                                  router.push(submission.submissionLink);
                                }
                              }}
                            >
                              <Trophy className="h-3 w-3" />
                              {isClickable ? `Score: ${total}` : "Submitted"}
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
