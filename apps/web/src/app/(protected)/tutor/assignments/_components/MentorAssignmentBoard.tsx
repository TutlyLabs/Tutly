"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Filter,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Badge } from "@tutly/ui/badge";
import { Button } from "@tutly/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tutly/ui/dropdown-menu";
import { Input } from "@tutly/ui/input";
import { ScrollArea, ScrollBar } from "@tutly/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tutly/ui/select";
import { Skeleton } from "@tutly/ui/skeleton";
import { cn } from "@tutly/utils";
import { UserLink } from "@/components/UserLink";
import NoDataFound from "@/components/NoDataFound";
import type { Course, User } from "@tutly/db/browser";

import { api } from "@/trpc/react";

type StudentWithRelations = User & {
  course: Course[];
  enrolledUsers: {
    courseId: string;
    mentorUsername: string;
  }[];
};

type CourseWithRelations = Course & {
  classes: { id: string; createdAt: Date }[];
  _count: { classes: number };
};

const MentorAssignmentBoard = ({
  courses,
  students,
  role,
  currentUser,
}: {
  courses: CourseWithRelations[];
  students: StudentWithRelations[];
  role: string;
  currentUser: { username: string };
}) => {
  const router = useRouter();
  const [currentCourse, setCurrentCourse] = useState<string>(
    courses[0]?.id || "",
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterBy, setFilterBy] = useState<
    "all" | "fully" | "partial" | "none" | "pending"
  >("all");
  const [sortBy, setSortBy] = useState<"name" | "submitted" | "evaluated">(
    "submitted",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  const statsQuery = api.assignments.getCourseStudentStats.useQuery(
    { courseId: currentCourse },
    { enabled: Boolean(currentCourse) },
  );

  const totalAssignments = statsQuery.data?.data?.totalAssignments ?? 0;
  const statsByUser = useMemo(
    () => statsQuery.data?.data?.stats ?? {},
    [statsQuery.data],
  );

  const visibleStudents = useMemo(() => {
    const filtered = students.filter((student: StudentWithRelations) => {
      if (student.role !== "STUDENT") return false;
      if (role === "MENTOR") {
        if (
          !student.enrolledUsers?.some(
            (x) =>
              x.mentorUsername === currentUser.username &&
              x.courseId === currentCourse,
          )
        )
          return false;
      } else {
        if (!student.enrolledUsers?.some((x) => x.courseId === currentCourse))
          return false;
      }
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        student.name.toLowerCase().includes(q) ||
        student.username.toLowerCase().includes(q)
      );
    });

    const list = filtered
      .map((s) => {
        const stat = statsByUser[s.username] ?? {
          submitted: 0,
          evaluated: 0,
        };
        return {
          ...s,
          _submitted: stat.submitted,
          _evaluated: stat.evaluated,
          _underReview: Math.max(0, stat.submitted - stat.evaluated),
          _missing: Math.max(0, totalAssignments - stat.submitted),
        };
      })
      .filter((s: any) => {
        if (filterBy === "all") return true;
        if (filterBy === "none") return s._submitted === 0;
        if (filterBy === "pending") return s._underReview > 0;
        if (filterBy === "fully")
          return totalAssignments > 0 && s._submitted >= totalAssignments;
        if (filterBy === "partial")
          return s._submitted > 0 && s._submitted < totalAssignments;
        return true;
      });

    list.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "submitted") cmp = a._submitted - b._submitted;
      else if (sortBy === "evaluated") cmp = a._evaluated - b._evaluated;
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return list;
  }, [
    students,
    role,
    currentUser.username,
    currentCourse,
    searchQuery,
    filterBy,
    sortBy,
    sortOrder,
    statsByUser,
    totalAssignments,
  ]);

  const aggregate = useMemo(() => {
    const totalStudents = visibleStudents.length;
    const fullySubmitted = visibleStudents.filter(
      (s: any) => totalAssignments > 0 && s._submitted >= totalAssignments,
    ).length;
    const noSubmissions = visibleStudents.filter(
      (s: any) => s._submitted === 0,
    ).length;
    return { totalStudents, fullySubmitted, noSubmissions };
  }, [visibleStudents, totalAssignments]);

  if (!isMounted) return null;

  const currentCourseTitle =
    courses.find((c) => c.id === currentCourse)?.title ?? "Submissions";

  const toggleSort = (key: "name" | "submitted" | "evaluated") => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder(key === "name" ? "asc" : "desc");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-5">
      {/* Hero band */}
      <div className="bg-card relative overflow-hidden rounded-2xl border p-5 shadow-sm sm:p-6">
        <div className="bg-linear-to-br pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full from-emerald-500/10 via-sky-500/10 to-transparent blur-2xl" />
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase">
                <Users className="h-3.5 w-3.5 text-emerald-500" />
                Submissions
              </div>
              <h1 className="text-foreground mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                {currentCourseTitle}
              </h1>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {aggregate.totalStudents}{" "}
                {aggregate.totalStudents === 1 ? "student" : "students"} ·{" "}
                {totalAssignments}{" "}
                {totalAssignments === 1 ? "assignment" : "assignments"} in this
                course
              </p>
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

          {totalAssignments > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="bg-muted/60 text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium">
                <CheckCircle className="h-3 w-3 text-emerald-500" />
                <span className="text-foreground">
                  {aggregate.fullySubmitted}
                </span>{" "}
                fully submitted
              </span>
              <span className="bg-muted/60 text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium">
                <XCircle className="h-3 w-3 text-rose-500" />
                <span className="text-foreground">
                  {aggregate.noSubmissions}
                </span>{" "}
                no submissions
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Controls: course chips · search · sort — single row on desktop */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
        <ScrollArea className="-mx-3 min-w-0 flex-1 sm:mx-0">
          <div className="flex gap-2 px-3 pb-1 sm:px-0">
            {courses
              .filter((c) => c.isPublished !== false)
              .map((course) => (
                <Button
                  key={course.id}
                  variant={
                    currentCourse === course.id ? "default" : "outline"
                  }
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

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative flex-1 lg:w-56 lg:flex-none">
            <Search className="text-muted-foreground/70 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="bg-background h-9 rounded-full pl-9 text-sm"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "relative h-9 w-9 shrink-0 rounded-full",
                  filterBy !== "all" &&
                    "border-primary/40 text-primary",
                )}
                aria-label="Filter"
              >
                <Filter className="h-4 w-4" />
                {filterBy !== "all" && (
                  <span className="bg-primary absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                Filter
              </DropdownMenuLabel>
              {(
                [
                  { key: "all", label: "All students" },
                  { key: "fully", label: "Fully submitted" },
                  { key: "partial", label: "Partially submitted" },
                  { key: "pending", label: "Has pending review" },
                  { key: "none", label: "No submissions" },
                ] as const
              ).map((opt) => (
                <DropdownMenuItem
                  key={opt.key}
                  onSelect={() => setFilterBy(opt.key)}
                  className="flex items-center justify-between"
                >
                  <span
                    className={cn(
                      filterBy === opt.key && "text-primary font-medium",
                    )}
                  >
                    {opt.label}
                  </span>
                  {filterBy === opt.key && (
                    <Check className="text-primary h-3.5 w-3.5" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                Sort by
              </DropdownMenuLabel>
              {(
                [
                  { key: "submitted", label: "Submitted" },
                  { key: "evaluated", label: "Evaluated" },
                  { key: "name", label: "Name" },
                ] as const
              ).map((opt) => (
                <DropdownMenuItem
                  key={opt.key}
                  onSelect={() => toggleSort(opt.key)}
                  className="flex items-center justify-between"
                >
                  <span
                    className={cn(
                      sortBy === opt.key && "text-primary font-medium",
                    )}
                  >
                    {opt.label}
                  </span>
                  {sortBy === opt.key &&
                    (sortOrder === "asc" ? (
                      <ArrowUp className="text-primary h-3.5 w-3.5" />
                    ) : (
                      <ArrowDown className="text-primary h-3.5 w-3.5" />
                    ))}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="text-muted-foreground text-[11px]"
              >
                Toggle order ({sortOrder === "asc" ? "ascending" : "descending"})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* List */}
      {statsQuery.isLoading ? (
        <div className="bg-card divide-border divide-y rounded-xl border shadow-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
          ))}
        </div>
      ) : visibleStudents.length === 0 ? (
        <div className="bg-card rounded-xl border py-12 shadow-sm">
          <NoDataFound message="No students found" />
        </div>
      ) : (
        <ul className="bg-card divide-border divide-y overflow-hidden rounded-xl border shadow-sm">
          {visibleStudents.map((student: any, index: number) => {
            const total = totalAssignments;
            const submitted = student._submitted;
            const evaluated = student._evaluated;
            const underReview = student._underReview;
            const completionPct =
              total > 0 ? Math.round((submitted / total) * 100) : 0;
            return (
              <li key={student.id ?? student.username}>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/tutor/assignments/student?id=${student.username}`,
                    )
                  }
                  className="hover:bg-accent/40 flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors sm:gap-4 sm:px-5 sm:py-3.5"
                >
                  <span className="text-muted-foreground/70 hidden w-6 text-center text-[11px] font-medium tabular-nums sm:inline">
                    {index + 1}
                  </span>
                  <UserLink username={student.username} stopPropagation>
                    <Image
                      src={student.image || "/placeholder.jpg"}
                      width={40}
                      height={40}
                      alt={student.name}
                      className="h-10 w-10 shrink-0 rounded-full object-cover transition-opacity hover:opacity-80"
                    />
                  </UserLink>
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground truncate text-sm font-medium sm:text-[15px]">
                      {student.name}
                    </div>
                    <div className="text-muted-foreground truncate text-[11px]">
                      @{student.username}
                    </div>
                  </div>
                  <div className="hidden w-40 shrink-0 flex-col gap-1 sm:flex">
                    <div className="text-muted-foreground flex items-center justify-between text-[10px] font-medium">
                      <span>{completionPct}%</span>
                      <span>
                        {submitted}/{total}
                      </span>
                    </div>
                    <div className="bg-muted flex h-1.5 w-full overflow-hidden rounded-full">
                      {total > 0 && evaluated > 0 && (
                        <div
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${(evaluated / total) * 100}%`,
                          }}
                        />
                      )}
                      {total > 0 && underReview > 0 && (
                        <div
                          className="h-full bg-amber-500"
                          style={{
                            width: `${(underReview / total) * 100}%`,
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="hidden w-28 shrink-0 justify-end sm:flex">
                    <Badge className="h-6 gap-1 rounded-full bg-emerald-500/15 text-[11px] font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400">
                      <CheckCircle className="h-3 w-3" />
                      {evaluated} evaluated
                    </Badge>
                  </div>
                  <div className="hidden w-25 shrink-0 justify-end sm:flex">
                    {underReview > 0 ? (
                      <Badge className="h-6 gap-1 rounded-full bg-amber-500/15 text-[11px] font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        {underReview} pending
                      </Badge>
                    ) : null}
                  </div>
                  <div className="hidden w-30 shrink-0 justify-end sm:flex">
                    <Badge className="bg-muted text-muted-foreground hover:bg-muted/80 h-6 gap-1 rounded-full text-[11px] font-medium">
                      {submitted}/{total} submitted
                    </Badge>
                  </div>
                  {/* Mobile: just show stacked badges */}
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:hidden">
                    <Badge className="h-6 gap-1 rounded-full bg-emerald-500/15 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      {evaluated}/{total}
                    </Badge>
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
};

export default MentorAssignmentBoard;
