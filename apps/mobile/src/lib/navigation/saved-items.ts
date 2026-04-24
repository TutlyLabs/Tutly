import type {
  AssignmentSummary,
  ClassSummary,
  CourseSummary,
} from "~/types/tutly";

type SavedItem = {
  category?: string | null;
  objectId: string;
  causedObjects?: Record<string, string> | null;
};

type CatalogClass = Pick<ClassSummary, "id" | "title" | "courseId">;

type SavedItemCatalogInput = {
  assignments: AssignmentSummary[];
  classes: CatalogClass[];
  courses: CourseSummary[];
};

type SavedItemCatalog = {
  assignmentsById: Map<string, AssignmentSummary>;
  classesById: Map<string, CatalogClass>;
  coursesById: Map<string, CourseSummary>;
};

export type ResolvedSavedItem = {
  title: string;
  subtitle: string;
  href?: string;
  fallbackWebPath?: string;
};

export function buildSavedItemCatalog({
  assignments,
  classes,
  courses,
}: SavedItemCatalogInput): SavedItemCatalog {
  return {
    assignmentsById: new Map(assignments.map((item) => [item.id, item])),
    classesById: new Map(classes.map((item) => [item.id, item])),
    coursesById: new Map(courses.map((item) => [item.id, item])),
  };
}

export function formatSavedCategory(category?: string | null) {
  if (!category) return "Saved item";
  return category
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function resolveSavedItem(
  item: SavedItem,
  catalog: SavedItemCatalog,
): ResolvedSavedItem {
  const category = item.category?.toUpperCase();
  const assignmentId =
    item.causedObjects?.assignmentId ??
    (category === "ASSIGNMENT" ? item.objectId : undefined);

  if (assignmentId) {
    const assignment = catalog.assignmentsById.get(assignmentId);
    const courseTitle =
      assignment?.class?.course?.title || assignment?.class?.title;

    return {
      title: assignment?.title || item.objectId,
      subtitle: courseTitle || "Assignment saved for quick return",
      href: `/assignment/${assignmentId}`,
      fallbackWebPath: `/assignments/${assignmentId}`,
    };
  }

  const classId =
    item.causedObjects?.classId ??
    (category === "CLASS" ? item.objectId : undefined);

  if (classId) {
    const classItem = catalog.classesById.get(classId);
    const courseTitle = classItem?.courseId
      ? catalog.coursesById.get(classItem.courseId)?.title
      : undefined;

    return {
      title: classItem?.title || item.objectId,
      subtitle: courseTitle || "Class saved for offline review",
      href: `/class/${classId}`,
      fallbackWebPath: classItem?.courseId
        ? `/courses/${classItem.courseId}/classes/${classId}`
        : undefined,
    };
  }

  const courseId =
    item.causedObjects?.courseId ??
    (category === "COURSE" ? item.objectId : undefined);

  if (courseId) {
    const course = catalog.coursesById.get(courseId);

    return {
      title: course?.title || item.objectId,
      subtitle: "Course saved to your mobile library",
      href: `/course/${courseId}`,
      fallbackWebPath: `/courses/${courseId}`,
    };
  }

  if (category === "NOTIFICATION") {
    return {
      title: "Notification center",
      subtitle: "Saved system updates and reminders",
      href: "/notifications",
      fallbackWebPath: "/notifications",
    };
  }

  if (category === "DOUBT") {
    return {
      title: item.objectId,
      subtitle: "Continue this thread on web",
      fallbackWebPath: "/doubt",
    };
  }

  return {
    title: item.objectId,
    subtitle: formatSavedCategory(category),
  };
}
