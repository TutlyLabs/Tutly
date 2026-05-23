import type { Locator } from "@tutly/storage";

// Prisma `select` fragment for building a Locator from an attachment row.
export const locatorSelect = {
  id: true,
  courseId: true,
  course: {
    select: {
      id: true,
      createdBy: { select: { organizationId: true } },
    },
  },
} as const;

export type LocatorRow = {
  id: string;
  courseId: string | null;
  course: { createdBy: { organizationId: string | null } } | null;
};

export function locatorFrom(row: LocatorRow): Locator {
  return {
    orgId: row.course?.createdBy?.organizationId ?? null,
    courseId: row.courseId,
    assignmentId: row.id,
  };
}
