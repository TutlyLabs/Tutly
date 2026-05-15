import day from "@tutly/utils/dayjs";

import type { RouterOutputs } from "@/trpc/react";

type CohortReportSuccess = Extract<
  RouterOutputs["glimpse"]["getCohortReport"],
  { success: true }
>;

export type CourseReport = CohortReportSuccess["courses"][number];
export type MentorRow = CourseReport["mentorRows"][number];
export type AssignmentRow = CourseReport["assignmentRows"][number];

const IST = "Asia/Kolkata";

export function ist(iso: string | null | undefined) {
  if (!iso) return null;
  const d = day(iso);
  if (!d.isValid()) return null;
  try {
    return d.tz(IST);
  } catch {
    return d;
  }
}

export function relativeIST(iso: string | null | undefined): string {
  const d = ist(iso);
  return d ? d.fromNow() : "—";
}

export function shortIST(iso: string | null | undefined): string {
  const d = ist(iso);
  return d ? d.format("DD MMM") : "—";
}

export function dateTimeIST(iso: string | null | undefined): string {
  const d = ist(iso);
  return d ? d.format("DD MMM YYYY, hh:mm A") + " IST" : "—";
}

function pct(n: number, d: number): string {
  if (!d) return "—";
  return `${Math.round((n * 100) / d)}%`;
}

export function mentorDisplay(m: {
  mentorName?: string | null;
  mentorUsername: string | null;
}): string {
  if (!m.mentorUsername) return "Unassigned";
  return m.mentorName
    ? `${m.mentorName} (@${m.mentorUsername})`
    : `@${m.mentorUsername}`;
}

// Mobile → @+<intl-digits>. Defaults missing country code to +91.
export function whatsappMention(mobile: string | null | undefined): string | null {
  if (!mobile) return null;
  const raw = String(mobile).trim();
  const digits = raw.replace(/\D+/g, "");
  if (digits.length < 7) return null;
  if (!raw.startsWith("+") && digits.length === 10) return `@+91${digits}`;
  return `@+${digits}`;
}

function courseHeader(c: CourseReport, staleDays: number) {
  const lines: string[] = [];
  lines.push(`📚 *${c.title}*${c.isPublished ? "" : " (draft)"}`);
  lines.push(
    `${c.mentorsCount} mentors · ${c.studentsCount} students · ${c.classesCount} classes · ${c.assignmentsCount} assignments`,
  );
  if (c.latestClass) {
    lines.push(
      `🎬 Last class: ${c.latestClass.title} (${relativeIST(c.latestClass.createdAt)})`,
    );
  }
  if (c.latestAssignment) {
    lines.push(
      `📝 Last assignment: ${c.latestAssignment.title} (${relativeIST(c.latestAssignment.createdAt)})`,
    );
  }
  lines.push(
    `✅ Submitted ever: ${c.totals.studentsWhoSubmitted}/${c.studentsCount} (${pct(c.totals.studentsWhoSubmitted, c.studentsCount)})`,
  );
  lines.push(
    `✅ Submissions evaluated: ${c.totals.evaluated}/${c.totals.submissions} (${pct(c.totals.evaluated, c.totals.submissions)})`,
  );
  lines.push(
    `${c.totals.idleStudents > 0 ? "⚠️" : "•"} Idle >=${staleDays}d: ${c.totals.idleStudents}`,
  );
  lines.push(
    `${c.totals.neverSignedIn > 0 ? "🔴" : "•"} Never signed in: ${c.totals.neverSignedIn}`,
  );
  if (c.totals.classesPendingAttendance > 0) {
    lines.push(
      `⏳ Attendance pending: ${c.totals.classesPendingAttendance} class${c.totals.classesPendingAttendance === 1 ? "" : "es"}`,
    );
    const recent = c.classesPendingAttendance.slice(0, 5);
    for (const cl of recent) {
      lines.push(`   • ${cl.title} (${relativeIST(cl.createdAt)})`);
    }
    if (c.classesPendingAttendance.length > recent.length) {
      lines.push(
        `   • ...and ${c.classesPendingAttendance.length - recent.length} more`,
      );
    }
  }
  return lines.join("\n");
}

function mentorBlock(
  c: CourseReport,
  m: MentorRow,
  staleDays: number,
  recentDays: number,
): string {
  const lines: string[] = [];
  const mention = whatsappMention(m.mentorMobile);
  const friendly = m.mentorName
    ? `${m.mentorName} (@${m.mentorUsername})`
    : m.mentorUsername
      ? `@${m.mentorUsername}`
      : "Unassigned";
  const heading = mention ? `${mention} ${friendly}` : friendly;
  lines.push(`👤 *${heading}* — ${m.mentees} mentees`);
  lines.push(
    `📥 Submissions: ${m.totalSubs} received · ${m.evaluated} evaluated · ${m.pending} pending review`,
  );
  lines.push(
    `✅ Active last ${recentDays}d: ${m.recentSubmitters} · avg ${m.avgSubs.toFixed(1)} subs/mentee`,
  );
  if (m.lastSubmission) {
    lines.push(`🕒 Last submission: ${relativeIST(m.lastSubmission)}`);
  }
  if (m.neverSignedIn > 0)
    lines.push(`🔴 ${m.neverSignedIn} never signed in`);
  if (m.idle > 0) lines.push(`⚠️ ${m.idle} idle >=${staleDays}d`);
  if (m.neverSubmitted > 0)
    lines.push(`⏳ ${m.neverSubmitted} never submitted`);
  if (
    m.neverSignedIn === 0 &&
    m.idle === 0 &&
    m.neverSubmitted === 0 &&
    m.mentees > 0
  ) {
    lines.push(`✅ All mentees are active`);
  }

  // Dedupe across the three buckets: never-in > never-submitted > idle.
  const usernameSet = new Set(c.neverSignedInList.map((p) => p.username));
  const neverSignedInMine = c.neverSignedInList.filter(
    (p) => p.mentor === m.mentorUsername,
  );
  const neverSubmittedMine = c.neverSubmittedList.filter(
    (p) => p.mentor === m.mentorUsername && !usernameSet.has(p.username),
  );
  neverSubmittedMine.forEach((p) => usernameSet.add(p.username));
  const idleMine = c.idleList.filter(
    (p) => p.mentor === m.mentorUsername && !usernameSet.has(p.username),
  );

  const renderList = (
    title: string,
    rows: { name: string | null; username: string }[],
    suffix: (r: { name: string | null; username: string }) => string,
    limit = 5,
  ) => {
    if (rows.length === 0) return;
    lines.push("");
    lines.push(`_${title} (${rows.length})_`);
    for (const r of rows.slice(0, limit)) {
      lines.push(`   • ${r.name ?? r.username} (@${r.username})${suffix(r)}`);
    }
    if (rows.length > limit)
      lines.push(`   • ...and ${rows.length - limit} more`);
  };

  renderList("🔴 Never signed in", neverSignedInMine, () => "");
  renderList(
    "⏳ Never submitted",
    neverSubmittedMine,
    (r) => {
      const lastSeen = c.neverSubmittedList.find(
        (x) => x.username === r.username,
      )?.lastSeen;
      return lastSeen ? ` — last seen ${relativeIST(lastSeen)}` : "";
    },
  );
  renderList(
    `⚠️ Idle >=${staleDays}d`,
    idleMine,
    (r) => {
      const lastSeen = c.idleList.find((x) => x.username === r.username)
        ?.lastSeen;
      return lastSeen ? ` — last seen ${relativeIST(lastSeen)}` : "";
    },
  );

  return lines.join("\n");
}

function assignmentBlock(c: CourseReport): string {
  if (c.assignmentRows.length === 0) return "";
  const lines: string[] = ["📝 *Assignments*"];
  const recent = c.assignmentRows.slice(-10).reverse();
  for (const a of recent) {
    const subPct = pct(a.submitted, a.totalEligible);
    const evalPct = pct(a.evaluated, a.totalSubs);
    const tags: string[] = [];
    if (a.overdue) tags.push("⏰ overdue");
    if (a.pending > 0) tags.push(`⚠️ ${a.pending} pending review`);
    const tagStr = tags.length > 0 ? ` — ${tags.join(", ")}` : "";
    lines.push(
      `• ${a.title}: ${a.submitted}/${a.totalEligible} (${subPct}) submitted · ${evalPct} reviewed${tagStr}`,
    );
  }
  if (c.assignmentRows.length > 10)
    lines.push(`• ...and ${c.assignmentRows.length - 10} earlier assignments`);
  return lines.join("\n");
}

const SEPARATOR = "\n---\n";

export function buildCourseSection({
  course,
  staleDays,
  recentDays,
}: {
  course: CourseReport;
  staleDays: number;
  recentDays: number;
}): string {
  const blocks: string[] = [];
  blocks.push(courseHeader(course, staleDays));

  if (course.mentorRows.length > 0) {
    blocks.push("👥 *Mentor cohorts*");
    // Each mentor block is wrapped with --- so groups read cleanly in WhatsApp.
    const mentorChunks = course.mentorRows.map((m) =>
      mentorBlock(course, m, staleDays, recentDays),
    );
    blocks.push(mentorChunks.join("\n\n---\n\n"));
  }

  const a = assignmentBlock(course);
  if (a) blocks.push(a);

  return blocks.join("\n\n");
}

export function buildMentorSection({
  course,
  mentor,
  staleDays,
  recentDays,
}: {
  course: CourseReport;
  mentor: MentorRow;
  staleDays: number;
  recentDays: number;
}): string {
  const blocks: string[] = [];
  blocks.push(`📚 *${course.title}* — mentor report`);
  blocks.push(mentorBlock(course, mentor, staleDays, recentDays));
  return blocks.join("\n\n");
}

export function buildShareMessage({
  report,
  scope,
}: {
  report: CohortReportSuccess;
  scope:
    | { kind: "all" }
    | { kind: "course"; courseId: string }
    | { kind: "mentor"; courseId: string; mentorUsername: string | null };
}): string {
  const who = report.instructor.name ?? report.instructor.username;
  const org = report.instructor.organizationName;
  const headerLine1 = org
    ? `📊 *Cohort glimpse* — ${who} · ${org}`
    : `📊 *Cohort glimpse* — ${who}`;
  const header = [
    headerLine1,
    `🕒 ${dateTimeIST(report.generatedAt)} · Idle >=${report.staleDays}d · Recent ${report.recentDays}d`,
  ].join("\n");

  const sections: string[] = [header];

  const renderCourse = (course: CourseReport) => {
    sections.push(
      buildCourseSection({
        course,
        staleDays: report.staleDays,
        recentDays: report.recentDays,
      }),
    );
  };

  if (scope.kind === "all") {
    for (const course of report.courses) renderCourse(course);
  } else if (scope.kind === "course") {
    const course = report.courses.find((c) => c.id === scope.courseId);
    if (course) renderCourse(course);
  } else {
    const course = report.courses.find((c) => c.id === scope.courseId);
    if (!course) return sections.join(SEPARATOR);
    const mentor = course.mentorRows.find(
      (m) => m.mentorUsername === scope.mentorUsername,
    );
    if (!mentor) return sections.join(SEPARATOR);
    sections.push(
      buildMentorSection({
        course,
        mentor,
        staleDays: report.staleDays,
        recentDays: report.recentDays,
      }),
    );
  }

  return sections.join(SEPARATOR).trim();
}
