import { z } from "zod";

/**
 * One MCP tool per `agent.*` procedure, declared without a transport so the
 * stdio host (over HTTP) and the remote host (in-process) cannot drift.
 */
export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodRawShape;
  /** Non-writing tools, which hosts may auto-approve. */
  readOnly: boolean;
  /** Dotted `agent.*` path on the tRPC router. */
  procedure: string;
  kind: "query" | "mutation";
}

const dryRun = z
  .boolean()
  .optional()
  .describe(
    "Preview only: returns the planned effect without writing. Run this first, show the user the plan, then repeat with dryRun false.",
  );

const testCase = z.object({
  title: z
    .string()
    .describe("Unique within the assignment; identifies results."),
  command: z
    .string()
    .describe("Shell command; its exit code decides pass/fail."),
  visibility: z
    .enum(["VISIBLE", "HIDDEN"])
    .optional()
    .describe(
      "HIDDEN runs only on the trusted runner, never on student machines.",
    ),
  points: z.number().int().min(0).optional(),
  timeoutMs: z.number().int().min(1000).max(600_000).optional(),
});

const participant = z.object({
  name: z.string().optional().describe("Display name from the report."),
  email: z
    .string()
    .optional()
    .describe("Most reliable identifier — prefer it."),
  username: z.string().optional(),
  durationMinutes: z.number().min(0),
  joinTime: z.string().optional(),
  leaveTime: z.string().optional(),
});

export const TOOLS: ToolDefinition[] = [
  {
    name: "tutly_whoami",
    title: "Who am I",
    description:
      "Identify the authenticated user and list the courses they can teach or mentor. Call this first in a session to learn which courses are in scope.",
    inputSchema: {},
    readOnly: true,
    procedure: "agent.resolve.whoami",
    kind: "query",
  },
  {
    name: "tutly_resolve",
    title: "Resolve a name to an id",
    description:
      "Find courses, classes or assignments by partial title. Every other tool takes ids, so start here whenever the user refers to something by name ('the Wednesday DSA class'). Scoped to the caller's own courses.",
    inputSchema: {
      query: z.string().describe("Part of a title, case-insensitive."),
      kind: z
        .enum(["course", "class", "assignment", "any"])
        .optional()
        .describe("Narrow the search when the type is already known."),
    },
    readOnly: true,
    procedure: "agent.resolve.lookup",
    kind: "query",
  },

  /* ----------------------------- Classes ----------------------------- */
  {
    name: "tutly_list_classes",
    title: "List classes",
    description:
      "List a course's classes with assignment and attendance counts. Compact by design — use tutly_get_class for one class's detail.",
    inputSchema: { courseId: z.string() },
    readOnly: true,
    procedure: "agent.classes.list",
    kind: "query",
  },
  {
    name: "tutly_get_class",
    title: "Get a class",
    description:
      "Full detail for one class: video, folder, attached assignments and attendance count.",
    inputSchema: { classId: z.string() },
    readOnly: true,
    procedure: "agent.classes.get",
    kind: "query",
  },
  {
    name: "tutly_upsert_class",
    title: "Create or update a class",
    description:
      "Create a class (omit classId) or update one (pass it). Handles the video record and folder in a single transaction. Requires instructor permissions.",
    inputSchema: {
      classId: z.string().optional().describe("Omit to create."),
      courseId: z.string(),
      title: z.string(),
      video: z
        .object({
          type: z.enum(["DRIVE", "YOUTUBE", "ZOOM", "HLS"]).optional(),
          link: z.string().nullable().optional(),
          videoId: z
            .string()
            .optional()
            .describe("Required for HLS; comes from the upload pipeline."),
        })
        .optional(),
      folderId: z.string().optional(),
      folderName: z
        .string()
        .optional()
        .describe(
          "Created if it does not exist. Mutually exclusive with folderId.",
        ),
      classType: z.enum(["RECORDED", "LIVE"]).optional(),
      live: z
        .object({
          provider: z.enum(["ZOOM", "GOOGLE_MEET"]).optional(),
          startTime: z.string().optional().describe("ISO 8601."),
          endTime: z.string().optional().describe("ISO 8601."),
          meetingUrl: z.string().optional(),
          meetingId: z.string().optional(),
          meetingPasscode: z.string().optional(),
        })
        .optional()
        .describe("Required when classType is LIVE."),
      createdAt: z.string().optional().describe("ISO 8601; for backdating."),
      dryRun,
    },
    readOnly: false,
    procedure: "agent.classes.upsert",
    kind: "mutation",
  },
  {
    name: "tutly_delete_class",
    title: "Delete a class",
    description:
      "Delete a class. Attendance and attachments go with it. Call with dryRun true first — the response reports exactly what would be destroyed.",
    inputSchema: { classId: z.string(), dryRun },
    readOnly: false,
    procedure: "agent.classes.delete",
    kind: "mutation",
  },

  /* --------------------------- Assignments --------------------------- */
  {
    name: "tutly_list_assignments",
    title: "List assignments",
    description:
      "List assignments for a course or a class, with test-case and submission counts.",
    inputSchema: {
      courseId: z.string().optional(),
      classId: z.string().optional(),
    },
    readOnly: true,
    procedure: "agent.assignments.list",
    kind: "query",
  },
  {
    name: "tutly_get_assignment",
    title: "Get an assignment",
    description:
      "Full authoring view: details, workspace config and every test case with its command and points. Read this before editing an assignment so the test suite is not lost.",
    inputSchema: { assignmentId: z.string() },
    readOnly: true,
    procedure: "agent.assignments.get",
    kind: "query",
  },
  {
    name: "tutly_upsert_assignment",
    title: "Create or update an assignment",
    description:
      "Create or update an assignment together with its workspace config and its whole test suite, in one transaction. Passing testCases REPLACES the existing suite — read the assignment first and resend the cases you want to keep. Omit testCases to leave the suite untouched. Requires instructor permissions.",
    inputSchema: {
      assignmentId: z.string().optional().describe("Omit to create."),
      classId: z.string().optional(),
      courseId: z
        .string()
        .optional()
        .describe("One of classId or courseId is required when creating."),
      title: z.string(),
      details: z.string().optional().describe("Markdown problem statement."),
      link: z.string().optional(),
      dueDate: z.string().optional().describe("ISO date or date-time."),
      maxSubmissions: z.number().int().min(1).max(100).optional(),
      submissionMode: z
        .enum([
          "HTML_CSS_JS",
          "REACT",
          "EXTERNAL_LINK",
          "SANDBOX",
          "WORKSPACE",
          "GIT",
        ])
        .optional()
        .describe(
          "Implied WORKSPACE when workspace config or testCases are given.",
        ),
      workspace: z
        .object({
          framework: z.string().optional(),
          setupCommand: z.string().nullable().optional(),
          devCommand: z.string().nullable().optional(),
          testCommand: z.string().nullable().optional(),
          previewPorts: z.array(z.number().int()).optional(),
          readonlyPaths: z.array(z.string()).optional(),
        })
        .optional(),
      testCases: z.array(testCase).optional(),
      dryRun,
    },
    readOnly: false,
    procedure: "agent.assignments.upsert",
    kind: "mutation",
  },
  {
    name: "tutly_delete_assignment",
    title: "Delete an assignment",
    description:
      "Delete an assignment and its test cases. Call with dryRun true first to see how many submissions are attached.",
    inputSchema: { assignmentId: z.string(), dryRun },
    readOnly: false,
    procedure: "agent.assignments.delete",
    kind: "mutation",
  },

  /* ---------------------------- Attendance --------------------------- */
  {
    name: "tutly_attendance_summary",
    title: "Attendance summary",
    description:
      "What is already recorded for a class, and how it compares to the enrolled cohort.",
    inputSchema: { classId: z.string() },
    readOnly: true,
    procedure: "agent.attendance.summary",
    kind: "query",
  },
  {
    name: "tutly_import_attendance",
    title: "Import attendance from a meeting report",
    description:
      "Reconcile a Zoom/Meet/Teams participant report against the course roster and record attendance. YOU parse the export into rows; this tool resolves identities (email, then username, then full name, then roll-number prefix) and writes.\n\nAlways run with dryRun true first and show the user the result: rows land in matched / ambiguous / unmatched buckets, absentees are listed, and 'weakMatches' counts rows matched only by name prefix — those are the ones a renamed participant breaks. Re-importing is safe; it overwrites by default. Requires instructor permissions.",
    inputSchema: {
      classId: z.string(),
      participants: z
        .array(participant)
        .min(1)
        .max(2000)
        .describe("One row per join interval; rejoins are summed per person."),
      minimumMinutes: z
        .number()
        .min(0)
        .describe("Minutes attended required to count as present."),
      overwriteExisting: z
        .boolean()
        .optional()
        .describe("Default true: replaces existing rows for these users."),
      dryRun,
    },
    readOnly: false,
    procedure: "agent.attendance.import",
    kind: "mutation",
  },
  {
    name: "tutly_clear_attendance",
    title: "Clear a class's attendance",
    description:
      "Delete every attendance record for a class. Rarely needed — tutly_import_attendance already overwrites. Call with dryRun true first.",
    inputSchema: { classId: z.string(), dryRun },
    readOnly: false,
    procedure: "agent.attendance.clear",
    kind: "mutation",
  },
];
