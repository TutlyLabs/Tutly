function safe(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export type Locator = {
  orgId: string | null;
  courseId: string | null;
  assignmentId: string;
};

function basePrefix(loc: Locator): string {
  return [
    `org/${safe(loc.orgId ?? "_default")}`,
    `courses/${safe(loc.courseId ?? "_default")}`,
    `assignments/${safe(loc.assignmentId)}`,
  ].join("/");
}

export const Keys = {
  template: (loc: Locator) => `${basePrefix(loc)}/template`,
  hiddenTests: (loc: Locator) => `${basePrefix(loc)}/hidden-tests`,
  submission: (loc: Locator, submissionId: string) =>
    `${basePrefix(loc)}/submissions/${safe(submissionId)}`,
} as const;

export const META_FILE = "tutly.json";
