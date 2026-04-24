import type {
  AssignmentSummary,
  ClassSummary,
  CourseSummary,
  NotificationItem,
  ScheduleEvent,
} from "~/types/tutly";
import { asArray, unwrapData } from "./normalizers";

export function selectCourses(value: unknown): CourseSummary[] {
  return asArray<CourseSummary>(value);
}

export function selectClasses(value: unknown): ClassSummary[] {
  return asArray<ClassSummary>(value);
}

export function selectClass(value: unknown): ClassSummary | undefined {
  return unwrapData<ClassSummary>(value);
}

export function selectScheduleEvents(value: unknown): ScheduleEvent[] {
  const data = unwrapData<{ events?: ScheduleEvent[] }>(value);
  return data?.events ?? [];
}

export function selectNotifications(value: unknown): NotificationItem[] {
  return asArray<NotificationItem>(value);
}

export function selectDashboardCourses(value: unknown) {
  const data = unwrapData<{ courses?: Array<Record<string, any>> }>(value);
  return data?.courses ?? [];
}

export function selectAssignments(value: unknown): AssignmentSummary[] {
  const data = unwrapData<unknown>(value);

  if (Array.isArray(data)) {
    return flattenAssignmentCourses(data);
  }

  if (!data || typeof data !== "object") return [];
  const objectData = data as Record<string, unknown>;

  if (Array.isArray(objectData.assignments)) {
    return flattenAssignmentCourses(objectData.assignments);
  }

  if (Array.isArray(objectData.coursesWithAssignments)) {
    return flattenAssignmentCourses(objectData.coursesWithAssignments);
  }

  return [];
}

function flattenAssignmentCourses(courses: unknown[]): AssignmentSummary[] {
  return courses.flatMap((course) => {
    if (!course || typeof course !== "object") return [];
    const classes = (course as { classes?: unknown[] }).classes ?? [];
    return classes.flatMap((classItem) => {
      if (!classItem || typeof classItem !== "object") return [];
      const attachments =
        (classItem as { attachments?: AssignmentSummary[] }).attachments ?? [];
      return attachments;
    });
  });
}
