"use client";

import {
  AlertTriangle,
  Copy,
  Info,
  Loader2,
  MessageCircle,
  RefreshCw,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@tutly/ui/badge";
import { Button } from "@tutly/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@tutly/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@tutly/ui/tooltip";
import { cn } from "@tutly/utils";
import { UserLink } from "@/components/UserLink";
import { api } from "@/trpc/react";

import {
  buildShareMessage,
  dateTimeIST,
  mentorDisplay,
  relativeIST,
  shortIST,
  type AssignmentRow,
  type CourseReport,
  type MentorRow,
} from "./report-utils";

const ALL = "__all__";
const UNASSIGNED = "__unassigned__";

export default function GlimpseClient() {
  const [courseId, setCourseId] = useState<string>(ALL);
  const [mentorKey, setMentorKey] = useState<string>(ALL);
  const [staleDays, setStaleDays] = useState(7);
  const [recentDays, setRecentDays] = useState(7);

  const reportQ = api.glimpse.getCohortReport.useQuery({
    staleDays,
    recentDays,
  });

  const report = reportQ.data?.success ? reportQ.data : null;

  const courses = report?.courses ?? [];
  const selectedCourse =
    courseId === ALL
      ? null
      : (courses.find((c) => c.id === courseId) ?? null);

  useEffect(() => {
    setMentorKey(ALL);
  }, [courseId]);

  const visibleMentors = selectedCourse?.mentorRows ?? [];
  const selectedMentor =
    selectedCourse && mentorKey !== ALL
      ? (visibleMentors.find(
          (m) => (m.mentorUsername ?? UNASSIGNED) === mentorKey,
        ) ?? null)
      : null;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied — paste anywhere.");
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  };

  const scopedMessage = useMemo(() => {
    if (!report) return "";
    if (selectedMentor && selectedCourse) {
      return buildShareMessage({
        report,
        scope: {
          kind: "mentor",
          courseId: selectedCourse.id,
          mentorUsername: selectedMentor.mentorUsername,
        },
      });
    }
    if (selectedCourse) {
      return buildShareMessage({
        report,
        scope: { kind: "course", courseId: selectedCourse.id },
      });
    }
    return buildShareMessage({ report, scope: { kind: "all" } });
  }, [report, selectedCourse, selectedMentor]);

  const shareToWhatsApp = (msg: string) => {
    if (!msg) return;
    if (msg.length > 5000) {
      toast.warning(
        "Report is large — WhatsApp may truncate. Use Copy and paste into a doc instead.",
      );
    }
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Glimpse
          </h1>
          <p className="text-muted-foreground text-sm">
            Per-cohort signals — share with mentors in one click.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DayPicker
            label="Idle"
            value={staleDays}
            onChange={setStaleDays}
            hint={
              <>
                <p className="font-medium">Idle threshold</p>
                <p className="mt-1">
                  A student is <b>Idle</b> if their last login was more than{" "}
                  <b>{staleDays} days</b> ago. Affects the "Idle" stat and the
                  "Students idle ≥{staleDays}d" list. Never-signed-in students
                  are counted separately.
                </p>
                <p className="text-muted-foreground mt-1">
                  Doesn't affect any submission counts.
                </p>
              </>
            }
          />
          <DayPicker
            label="Recent"
            value={recentDays}
            onChange={setRecentDays}
            hint={
              <>
                <p className="font-medium">Recent-activity window</p>
                <p className="mt-1">
                  Only used to compute the per-mentor{" "}
                  <b>"Active in last {recentDays}d"</b> column — i.e. how many
                  of their mentees submitted anything in this window.
                </p>
                <p className="text-muted-foreground mt-1">
                  Submission totals, evaluated/pending counts, "submitted
                  ever" and the assignment-wise table are <b>not</b> filtered
                  by this window.
                </p>
              </>
            }
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => reportQ.refetch()}
            disabled={reportQ.isFetching}
            className="h-9 cursor-pointer gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${reportQ.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {reportQ.isLoading && (
        <div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-xl border p-12 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Crunching cohort data…
        </div>
      )}

      {reportQ.data?.success === false && (
        <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-xl border p-4 text-sm">
          {reportQ.data.error}
        </div>
      )}

      {report && courses.length === 0 && (
        <div className="bg-card text-muted-foreground rounded-xl border p-12 text-center text-sm">
          No courses found under this instructor.
        </div>
      )}

      {report && courses.length > 0 && (
        <>
          <PillRow
            options={[
              { value: ALL, label: "All courses", count: courses.length },
              ...courses.map((c) => ({
                value: c.id,
                label: c.title,
                count: c.studentsCount,
              })),
            ]}
            active={courseId}
            onChange={setCourseId}
          />

          <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Generated</span>
              <span className="text-foreground font-medium">
                {dateTimeIST(report.generatedAt)}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                Idle ≥ {report.staleDays}d
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                Recent {report.recentDays}d
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(scopedMessage)}
                className="h-8 cursor-pointer gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy{" "}
                {selectedMentor
                  ? "mentor"
                  : selectedCourse
                    ? "course"
                    : "all"}
              </Button>
              <Button
                size="sm"
                onClick={() => shareToWhatsApp(scopedMessage)}
                className="h-8 cursor-pointer gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Share to WhatsApp
              </Button>
            </div>
          </div>

          {selectedCourse ? (
            <CourseView
              course={selectedCourse}
              staleDays={report.staleDays}
              recentDays={report.recentDays}
              mentorKey={mentorKey}
              setMentorKey={setMentorKey}
              selectedMentor={selectedMentor}
              onCopyMentor={(m) =>
                handleCopy(
                  buildShareMessage({
                    report,
                    scope: {
                      kind: "mentor",
                      courseId: selectedCourse.id,
                      mentorUsername: m.mentorUsername,
                    },
                  }),
                )
              }
              onShareMentor={(m) =>
                shareToWhatsApp(
                  buildShareMessage({
                    report,
                    scope: {
                      kind: "mentor",
                      courseId: selectedCourse.id,
                      mentorUsername: m.mentorUsername,
                    },
                  }),
                )
              }
            />
          ) : (
            <AllCoursesView
              courses={courses}
              staleDays={report.staleDays}
              onCopyCourse={(c) =>
                handleCopy(
                  buildShareMessage({
                    report,
                    scope: { kind: "course", courseId: c.id },
                  }),
                )
              }
              onShareCourse={(c) =>
                shareToWhatsApp(
                  buildShareMessage({
                    report,
                    scope: { kind: "course", courseId: c.id },
                  }),
                )
              }
              onSelect={setCourseId}
            />
          )}
        </>
      )}
    </div>
  );
}

function PillRow({
  options,
  active,
  onChange,
}: {
  options: { value: string; label: string; count?: number }[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="bg-muted/40 inline-flex max-w-full items-center gap-1 rounded-full p-1">
        {options.map((o) => {
          const isActive = active === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={cn(
                "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/70 hover:text-foreground",
              )}
            >
              <span className="max-w-[180px] truncate">{o.label}</span>
              {typeof o.count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
                    isActive
                      ? "bg-black/15 text-white dark:bg-white/15"
                      : "bg-background/80 text-muted-foreground",
                  )}
                >
                  {o.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayPicker({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: React.ReactNode;
}) {
  return (
    <div className="bg-background border-input text-foreground inline-flex h-9 items-center gap-1.5 rounded-md border px-2 text-xs font-medium">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number"
        min={1}
        max={365}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value);
          if (!isNaN(n) && n > 0 && n <= 365) onChange(n);
        }}
        className="bg-transparent w-12 text-center tabular-nums outline-none"
      />
      <span className="text-muted-foreground">d</span>
      {hint && (
        <Tooltip>
          <TooltipTrigger
            type="button"
            aria-label={`${label} info`}
            className="text-muted-foreground hover:text-foreground -mr-0.5 inline-flex h-5 w-5 cursor-help items-center justify-center"
          >
            <Info className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="end"
            className="max-w-xs space-y-1 text-xs"
          >
            {hint}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function AllCoursesView({
  courses,
  staleDays,
  onCopyCourse,
  onShareCourse,
  onSelect,
}: {
  courses: CourseReport[];
  staleDays: number;
  onCopyCourse: (c: CourseReport) => void;
  onShareCourse: (c: CourseReport) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {courses.map((course) => (
        <CourseSummaryCard
          key={course.id}
          course={course}
          staleDays={staleDays}
          onCopy={() => onCopyCourse(course)}
          onShare={() => onShareCourse(course)}
          onOpen={() => onSelect(course.id)}
        />
      ))}
    </div>
  );
}

function CourseSummaryCard({
  course,
  staleDays,
  onCopy,
  onShare,
  onOpen,
}: {
  course: CourseReport;
  staleDays: number;
  onCopy: () => void;
  onShare: () => void;
  onOpen: () => void;
}) {
  const submitterPct = course.studentsCount
    ? Math.round(
        (course.totals.studentsWhoSubmitted * 100) / course.studentsCount,
      )
    : 0;

  return (
    <section className="bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-foreground truncate text-base font-semibold">
            {course.title}
            {!course.isPublished && (
              <Badge variant="outline" className="ml-2 text-[10px] uppercase">
                Draft
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {course.mentorsCount} mentor
            {course.mentorsCount === 1 ? "" : "s"} · {course.studentsCount}{" "}
            students · {course.assignmentsCount} assignments
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <MiniStat
          label="Submitted ever"
          value={`${course.totals.studentsWhoSubmitted}/${course.studentsCount}`}
          sub={`${submitterPct}%`}
        />
        <MiniStat
          label="Pending review"
          value={String(course.totals.pending)}
          tone={course.totals.pending > 0 ? "warn" : undefined}
        />
        <MiniStat
          label={`Idle ≥${staleDays}d`}
          value={String(course.totals.idleStudents)}
          tone={course.totals.idleStudents > 0 ? "warn" : undefined}
        />
        <MiniStat
          label="Never signed in"
          value={String(course.totals.neverSignedIn)}
          tone={course.totals.neverSignedIn > 0 ? "danger" : undefined}
        />
      </div>

      {course.latestAssignment && (
        <p className="text-muted-foreground text-xs">
          Latest assignment ·{" "}
          <span className="text-foreground font-medium">
            {course.latestAssignment.title}
          </span>{" "}
          <span>({relativeIST(course.latestAssignment.createdAt)})</span>
        </p>
      )}

      <div className="flex items-center justify-end gap-1.5 border-t pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          className="h-8 cursor-pointer gap-1.5"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onShare}
          className="h-8 cursor-pointer gap-1.5"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Share
        </Button>
        <Button
          size="sm"
          onClick={onOpen}
          className="h-8 cursor-pointer gap-1.5"
        >
          <Users className="h-3.5 w-3.5" />
          Open
        </Button>
      </div>
    </section>
  );
}

function CourseView({
  course,
  staleDays,
  recentDays,
  mentorKey,
  setMentorKey,
  selectedMentor,
  onCopyMentor,
  onShareMentor,
}: {
  course: CourseReport;
  staleDays: number;
  recentDays: number;
  mentorKey: string;
  setMentorKey: (v: string) => void;
  selectedMentor: MentorRow | null;
  onCopyMentor: (m: MentorRow) => void;
  onShareMentor: (m: MentorRow) => void;
}) {
  const totalEligible = course.studentsCount;
  const submitterPct = totalEligible
    ? Math.round((course.totals.studentsWhoSubmitted * 100) / totalEligible)
    : 0;
  const evalPct = course.totals.submissions
    ? Math.round((course.totals.evaluated * 100) / course.totals.submissions)
    : 0;

  const mentorOptions = useMemo(
    () => [
      { value: ALL, label: "All mentors", count: course.mentorRows.length },
      ...course.mentorRows.map((m) => ({
        value: m.mentorUsername ?? UNASSIGNED,
        label: mentorDisplay(m),
        count: m.mentees,
      })),
    ],
    [course.mentorRows],
  );

  return (
    <div className="space-y-4">
      <section className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-foreground truncate text-base font-semibold sm:text-lg">
              {course.title}
              {!course.isPublished && (
                <Badge variant="outline" className="ml-2 text-[10px] uppercase">
                  Draft
                </Badge>
              )}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {course.mentorsCount} mentor
              {course.mentorsCount === 1 ? "" : "s"} · {course.studentsCount}{" "}
              students · {course.classesCount} classes ·{" "}
              {course.assignmentsCount} assignments
              {course.latestClass && (
                <>
                  {" · "}
                  Last class {relativeIST(course.latestClass.createdAt)}
                </>
              )}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 border-b p-4 sm:grid-cols-5 sm:p-5">
          <Stat
            label="Submitted ever"
            value={`${course.totals.studentsWhoSubmitted}/${totalEligible}`}
            sub={`${submitterPct}%`}
          />
          <Stat
            label="Submissions evaluated"
            value={`${course.totals.evaluated}/${course.totals.submissions}`}
            sub={`${evalPct}%`}
          />
          <Stat
            label={`Idle ≥ ${staleDays}d`}
            value={String(course.totals.idleStudents)}
            tone={course.totals.idleStudents > 0 ? "warn" : undefined}
          />
          <Stat
            label="Never signed in"
            value={String(course.totals.neverSignedIn)}
            tone={course.totals.neverSignedIn > 0 ? "danger" : undefined}
          />
          <Stat
            label="Attendance pending"
            value={String(course.totals.classesPendingAttendance)}
            sub={
              course.totals.classesPendingAttendance > 0
                ? `${course.totals.classesPendingAttendance} of ${course.classesCount} classes`
                : "all uploaded"
            }
            tone={
              course.totals.classesPendingAttendance > 0 ? "warn" : undefined
            }
          />
        </div>

        {course.classesPendingAttendance.length > 0 && (
          <div className="border-b px-4 py-3 sm:px-5">
            <div className="text-muted-foreground mb-1.5 text-[11px] font-medium tracking-wide uppercase">
              Classes missing attendance upload
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {course.classesPendingAttendance.map((cl) => (
                <li
                  key={cl.id}
                  className="bg-amber-500/10 text-amber-700 border-amber-500/30 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] dark:text-amber-400"
                >
                  <span className="font-medium">{cl.title}</span>
                  <span className="text-muted-foreground">
                    · {relativeIST(cl.createdAt)}
                  </span>
                </li>
              ))}
              {course.totals.classesPendingAttendance >
                course.classesPendingAttendance.length && (
                <li className="text-muted-foreground inline-flex items-center text-[11px]">
                  +{" "}
                  {course.totals.classesPendingAttendance -
                    course.classesPendingAttendance.length}{" "}
                  more
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="border-b px-4 py-3 sm:px-5">
          <PillRow
            options={mentorOptions}
            active={mentorKey}
            onChange={setMentorKey}
          />
        </div>

        {selectedMentor ? (
          <MentorPanel
            course={course}
            mentor={selectedMentor}
            staleDays={staleDays}
            recentDays={recentDays}
            onCopy={() => onCopyMentor(selectedMentor)}
            onShare={() => onShareMentor(selectedMentor)}
          />
        ) : (
          <MentorTable
            course={course}
            staleDays={staleDays}
            recentDays={recentDays}
            onPickMentor={(m) =>
              setMentorKey(m.mentorUsername ?? UNASSIGNED)
            }
          />
        )}
      </section>

      {!selectedMentor && (
        <AssignmentsCard
          rows={course.assignmentRows}
          totalEligible={totalEligible}
        />
      )}
    </div>
  );
}

function MentorTable({
  course,
  staleDays,
  recentDays,
  onPickMentor,
}: {
  course: CourseReport;
  staleDays: number;
  recentDays: number;
  onPickMentor: (m: MentorRow) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <Th>Mentor</Th>
            <Th align="right">Mentees</Th>
            <Th align="right">Subs</Th>
            <Th align="right">Evaluated</Th>
            <Th align="right">Pending</Th>
            <Th align="right">Never in</Th>
            <Th align="right">Idle ≥{staleDays}d</Th>
            <Th align="right">Never submitted</Th>
            <Th align="right">Recent {recentDays}d</Th>
            <Th>Last submission</Th>
          </TableRow>
        </TableHeader>
        <TableBody>
          {course.mentorRows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={10}
                className="text-muted-foreground py-6 text-center text-sm"
              >
                No students enrolled yet.
              </TableCell>
            </TableRow>
          )}
          {course.mentorRows.map((m) => (
            <TableRow
              key={m.mentorUsername ?? "unassigned"}
              onClick={() => onPickMentor(m)}
              className="hover:bg-accent/30 cursor-pointer"
            >
              <TableCell className="font-medium">
                {m.mentorUsername ? (
                  <div className="flex flex-col">
                    <span className="text-foreground">
                      {m.mentorName ?? m.mentorUsername}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      @{m.mentorUsername}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">— unassigned —</span>
                )}
              </TableCell>
              <Td align="right">{m.mentees}</Td>
              <Td align="right">{m.totalSubs}</Td>
              <Td align="right">{m.evaluated}</Td>
              <Td
                align="right"
                tone={m.pending > 0 ? "warn" : undefined}
              >
                {m.pending}
              </Td>
              <Td
                align="right"
                tone={m.neverSignedIn > 0 ? "danger" : undefined}
              >
                {m.neverSignedIn}
              </Td>
              <Td align="right" tone={m.idle > 0 ? "warn" : undefined}>
                {m.idle}
              </Td>
              <Td
                align="right"
                tone={m.neverSubmitted > 0 ? "warn" : undefined}
              >
                {m.neverSubmitted}
              </Td>
              <Td align="right">{m.recentSubmitters}</Td>
              <Td>{relativeIST(m.lastSubmission)}</Td>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MentorPanel({
  course,
  mentor,
  staleDays,
  recentDays,
  onCopy,
  onShare,
}: {
  course: CourseReport;
  mentor: MentorRow;
  staleDays: number;
  recentDays: number;
  onCopy: () => void;
  onShare: () => void;
}) {
  const own = (username: string | null) => username === mentor.mentorUsername;
  const seenInThisRow = new Set<string>();

  const neverSignedInMine = course.neverSignedInList.filter((p) =>
    own(p.mentor),
  );
  neverSignedInMine.forEach((p) => seenInThisRow.add(p.username));

  const neverSubmittedMine = course.neverSubmittedList.filter(
    (p) => own(p.mentor) && !seenInThisRow.has(p.username),
  );
  neverSubmittedMine.forEach((p) => seenInThisRow.add(p.username));

  const idleMine = course.idleList.filter(
    (p) => own(p.mentor) && !seenInThisRow.has(p.username),
  );

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-foreground text-base font-semibold">
            {mentor.mentorName ?? mentor.mentorUsername ?? "Unassigned"}
          </h3>
          {mentor.mentorUsername && (
            <div className="text-muted-foreground text-[11px]">
              @{mentor.mentorUsername}
              {mentor.mentorMobile && <> · {mentor.mentorMobile}</>}
            </div>
          )}
          <p className="text-muted-foreground mt-0.5 text-xs">
            {mentor.mentees} mentees · {mentor.recentSubmitters} active in last{" "}
            {recentDays}d · avg {mentor.avgSubs.toFixed(1)} submissions/mentee
            {mentor.lastSubmission && (
              <> · last submission {relativeIST(mentor.lastSubmission)}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onCopy}
            className="h-8 cursor-pointer gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
          <Button
            size="sm"
            onClick={onShare}
            className="h-8 cursor-pointer gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Mentees"
          value={String(mentor.mentees)}
        />
        <Stat
          label="Never signed in"
          value={String(mentor.neverSignedIn)}
          tone={mentor.neverSignedIn > 0 ? "danger" : undefined}
        />
        <Stat
          label={`Idle ≥${staleDays}d`}
          value={String(mentor.idle)}
          tone={mentor.idle > 0 ? "warn" : undefined}
        />
        <Stat
          label="Never submitted"
          value={String(mentor.neverSubmitted)}
          tone={mentor.neverSubmitted > 0 ? "warn" : undefined}
        />
      </div>

      {neverSignedInMine.length > 0 && (
        <RiskGroup
          title="Never signed in"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
          rows={neverSignedInMine.map((p) => ({
            name: p.name,
            username: p.username,
            extra: p.email ?? "—",
          }))}
          extraLabel="Email"
        />
      )}
      {neverSubmittedMine.length > 0 && (
        <RiskGroup
          title="Never submitted any assignment"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
          rows={neverSubmittedMine.map((p) => ({
            name: p.name,
            username: p.username,
            extra: p.lastSeen
              ? `last seen ${relativeIST(p.lastSeen)}`
              : "never signed in",
          }))}
          extraLabel="Last seen"
        />
      )}
      {idleMine.length > 0 && (
        <RiskGroup
          title={`Idle ≥ ${staleDays} days`}
          icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
          rows={idleMine.map((p) => ({
            name: p.name,
            username: p.username,
            extra: p.lastSeen ? relativeIST(p.lastSeen) : "—",
          }))}
          extraLabel="Last seen"
        />
      )}

      {neverSignedInMine.length === 0 &&
        neverSubmittedMine.length === 0 &&
        idleMine.length === 0 && (
          <div className="bg-muted/30 text-muted-foreground rounded-lg border p-6 text-center text-xs">
            All mentees in this cohort are active — nothing to flag.
          </div>
        )}
    </div>
  );
}

function RiskGroup({
  title,
  icon,
  rows,
  extraLabel,
  pageSize = 10,
}: {
  title: string;
  icon: React.ReactNode;
  rows: { name: string | null; username: string; extra: string }[];
  extraLabel: string;
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const slice = rows.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const start = safePage * pageSize + 1;
  const end = Math.min(rows.length, (safePage + 1) * pageSize);

  return (
    <div>
      <h4 className="text-foreground mb-2 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
        {icon}
        {title}
        <Badge variant="outline" className="text-[10px]">
          {rows.length}
        </Badge>
      </h4>
      <div className="overflow-hidden rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <Th>Name</Th>
                <Th>Username</Th>
                <Th>{extraLabel}</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.map((r) => (
                <TableRow key={r.username}>
                  <TableCell>{r.name ?? "—"}</TableCell>
                  <TableCell>
                    <UserLink username={r.username} className="text-primary">
                      @{r.username}
                    </UserLink>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {r.extra}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {rows.length > pageSize && (
          <div className="bg-muted/30 text-muted-foreground flex items-center justify-between border-t px-3 py-2 text-[11px]">
            <span>
              {start}–{end} of {rows.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="h-6 cursor-pointer px-2 text-[11px]"
              >
                Prev
              </Button>
              <span className="tabular-nums">
                {safePage + 1} / {pageCount}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={safePage >= pageCount - 1}
                className="h-6 cursor-pointer px-2 text-[11px]"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AssignmentsCard({
  rows,
  totalEligible,
}: {
  rows: AssignmentRow[];
  totalEligible: number;
}) {
  return (
    <section className="bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="text-muted-foreground border-b px-4 py-2.5 text-[11px] font-medium tracking-wide uppercase sm:px-5">
        Assignment-wise submission stats
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <Th>Assignment</Th>
              <Th>Posted</Th>
              <Th>Due</Th>
              <Th align="right">Submitted</Th>
              <Th align="right">Evaluated</Th>
              <Th align="right">Pending</Th>
              <Th align="right">Not submitted</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-6 text-center text-sm"
                >
                  No assignments posted yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((a) => {
              const subPct = totalEligible
                ? Math.round((a.submitted * 100) / totalEligible)
                : 0;
              const evPct = a.totalSubs
                ? Math.round((a.evaluated * 100) / a.totalSubs)
                : 0;
              return (
                <TableRow key={a.id}>
                  <TableCell className="max-w-[260px] truncate font-medium">
                    {a.title}
                  </TableCell>
                  <Td>{shortIST(a.postedAt)}</Td>
                  <Td tone={a.overdue ? "danger" : undefined}>
                    {a.dueDate ? shortIST(a.dueDate) : "—"}
                    {a.overdue ? " · overdue" : ""}
                  </Td>
                  <Td align="right">
                    <span className="tabular-nums">
                      {a.submitted}/{a.totalEligible}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      ({subPct}%)
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="tabular-nums">
                      {a.evaluated}/{a.totalSubs}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      ({evPct}%)
                    </span>
                  </Td>
                  <Td align="right" tone={a.pending > 0 ? "warn" : undefined}>
                    {a.pending}
                  </Td>
                  <Td
                    align="right"
                    tone={a.notSubmitted > 0 ? "warn" : undefined}
                  >
                    {a.notSubmitted}
                  </Td>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "warn" | "danger";
}) {
  const toneCls =
    tone === "danger"
      ? "text-rose-600 dark:text-rose-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground";
  return (
    <div className="border-border bg-background/40 rounded-lg border p-3">
      <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${toneCls}`}>
        {value}
      </div>
      {sub && (
        <div className="text-muted-foreground mt-0.5 text-xs">{sub}</div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "warn" | "danger";
}) {
  const toneCls =
    tone === "danger"
      ? "text-rose-600 dark:text-rose-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground";
  return (
    <div className="border-border bg-muted/30 rounded-md border px-3 py-2">
      <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {label}
      </div>
      <div
        className={`mt-0.5 text-base font-semibold tabular-nums ${toneCls}`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-muted-foreground text-[10px]">{sub}</div>
      )}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <TableHead
      className={`text-muted-foreground text-[11px] font-medium tracking-wide uppercase ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </TableHead>
  );
}

function Td({
  children,
  align,
  tone,
}: {
  children: React.ReactNode;
  align?: "right";
  tone?: "warn" | "danger";
}) {
  const toneCls =
    tone === "danger"
      ? "text-rose-600 dark:text-rose-400 font-medium"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400 font-medium"
        : "";
  return (
    <TableCell
      className={`${align === "right" ? "text-right tabular-nums" : ""} ${toneCls}`}
    >
      {children}
    </TableCell>
  );
}
