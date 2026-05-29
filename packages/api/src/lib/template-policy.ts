// File visibility & storage policy. Two concepts:
//   - hidden-from-student: not in the student's file tree / tabs / bundle
//   - template-only: never stored per-submission (always served from template)
// Test files are template-only but NOT hidden — students still see them.

export type SandpackFileObj = {
  code?: string;
  hidden?: boolean;
  readOnly?: boolean;
  active?: boolean;
};
export type SandpackFile = string | SandpackFileObj;
export type TemplateFiles = Record<string, SandpackFile>;
export type SandpackTemplate = {
  template?: string;
  options?: Record<string, unknown>;
  customSetup?: Record<string, unknown>;
  files?: TemplateFiles;
  [k: string]: unknown;
};

export function isHiddenFile(entry: SandpackFile | undefined): boolean {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "hidden" in entry &&
    (entry as SandpackFileObj).hidden === true
  );
}

export function isSolutionPath(p: string): boolean {
  const norm = p.startsWith("/") ? p : `/${p}`;
  // Matches /solution, /solution/foo, /solution.ts, /index.solution.js
  return /^\/solution(\/|\.|$)/i.test(norm) || /\.solution\./i.test(norm);
}

// Path-based hide: anything under /__hidden__/ is server-only.
export function isHiddenPath(p: string): boolean {
  const norm = p.startsWith("/") ? p : `/${p}`;
  return /^\/__hidden__(\/|$)/i.test(norm);
}

// *.test.ts / *.spec.tsx / etc. — instructor-owned, template-only.
export function isTestPath(p: string): boolean {
  return /\.(test|spec)\.[tj]sx?$/i.test(p);
}

export function isHiddenFromStudent(
  path: string,
  file: SandpackFile | undefined,
): boolean {
  return isSolutionPath(path) || isHiddenPath(path) || isHiddenFile(file);
}

// Wider than hidden — also includes test files (visible to student but
// owned by the template, never stored per-submission).
export function isTemplateOnly(
  path: string,
  file: SandpackFile | undefined,
): boolean {
  return isHiddenFromStudent(path, file) || isTestPath(path);
}

// Drops hidden + solution files; prunes dangling visibleFiles/activeFile.
// Note: test files are still shown so students can read them.
export function filterTemplateForStudent(
  template: SandpackTemplate,
): SandpackTemplate {
  const filesIn = template.files ?? {};
  const filesOut: TemplateFiles = {};
  for (const [path, entry] of Object.entries(filesIn)) {
    if (isHiddenFromStudent(path, entry)) continue;
    filesOut[path] = entry;
  }
  const allowed = new Set(Object.keys(filesOut));
  const opts = { ...(template.options ?? {}) } as Record<string, unknown>;
  if (Array.isArray(opts.visibleFiles)) {
    opts.visibleFiles = (opts.visibleFiles as string[]).filter((p) =>
      allowed.has(p),
    );
  }
  if (typeof opts.activeFile === "string" && !allowed.has(opts.activeFile)) {
    delete opts.activeFile;
  }
  return { ...template, files: filesOut, options: opts };
}

// Drops everything that's template-only before persisting a submission.
export function filterSubmissionInput(
  submitted: Record<string, string>,
  template: SandpackTemplate,
): Record<string, string> {
  const templateFiles = template.files ?? {};
  const out: Record<string, string> = {};
  for (const [path, code] of Object.entries(submitted)) {
    if (isTemplateOnly(path, templateFiles[path])) continue;
    out[path] = code;
  }
  return out;
}

// Template + submission overrides. Students get the stripped template first.
// Submission overlay only applies on non-template-only paths.
export function mergeForAudience(
  template: SandpackTemplate,
  submissionFiles: Record<string, string> | null,
  audience: "student" | "instructor" | "runner",
): SandpackTemplate {
  const base =
    audience === "student" ? filterTemplateForStudent(template) : template;
  if (!submissionFiles) return base;
  const out: TemplateFiles = { ...(base.files ?? {}) };
  const templateFilesFull = template.files ?? {};
  for (const [path, code] of Object.entries(submissionFiles)) {
    if (isTemplateOnly(path, templateFilesFull[path])) continue;
    out[path] = code;
  }
  return { ...base, files: out };
}
