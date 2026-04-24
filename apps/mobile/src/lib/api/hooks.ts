import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "~/lib/auth/auth-provider";
import { queryKeys } from "./query-keys";
import { trpc } from "./trpc";

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: () => trpc.users.getCurrentUser.query(),
  });
}

export function useDashboard() {
  const { user } = useAuth();
  const role = user?.role;

  return useQuery({
    enabled: Boolean(role),
    queryKey: queryKeys.dashboard(role),
    queryFn: async () => {
      if (role === "MENTOR")
        return trpc.dashboard.getMentorDashboardData.query();
      if (role === "INSTRUCTOR" || role === "ADMIN") {
        return trpc.dashboard.getInstructorDashboardData.query();
      }
      return trpc.dashboard.getStudentDashboardData.query();
    },
  });
}

export function useCourses() {
  return useQuery({
    queryKey: queryKeys.courses,
    queryFn: () => trpc.courses.getAllCourses.query(),
  });
}

export function useCourseClasses(courseId: string) {
  return useQuery({
    enabled: Boolean(courseId),
    queryKey: queryKeys.courseClasses(courseId),
    queryFn: () => trpc.classes.getClassesByCourseId.query({ courseId }),
  });
}

export function useClassDetails(classId: string) {
  return useQuery({
    enabled: Boolean(classId),
    queryKey: queryKeys.classDetails(classId),
    queryFn: () => trpc.classes.getClassDetails.query({ id: classId }),
  });
}

export function useObjectNote(objectId?: string) {
  const { user } = useAuth();

  return useQuery({
    enabled: Boolean(objectId && user?.id),
    queryKey: queryKeys.note(objectId || ""),
    queryFn: () =>
      trpc.notes.getNote.query({
        userId: user?.id || "",
        objectId: objectId || "",
      }),
  });
}

export function useObjectBookmark(objectId?: string) {
  const { user } = useAuth();

  return useQuery({
    enabled: Boolean(objectId && user?.id),
    queryKey: queryKeys.bookmark(objectId || ""),
    queryFn: () =>
      trpc.bookmarks.getBookmark.query({
        userId: user?.id || "",
        objectId: objectId || "",
      }),
  });
}

export function useAssignments() {
  const { user } = useAuth();
  const role = user?.role;

  return useQuery({
    queryKey: queryKeys.assignments(role),
    queryFn: async () => {
      if (role === "MENTOR") {
        return trpc.assignments.getAllAssignmentsForMentor.query();
      }
      if (role === "INSTRUCTOR" || role === "ADMIN") {
        return trpc.assignments.getAllAssignmentsForInstructor.query();
      }
      return trpc.assignments.getAllAssignedAssignments.query();
    },
  });
}

export function useAssignmentDetails(assignmentId: string) {
  return useQuery({
    enabled: Boolean(assignmentId),
    queryKey: queryKeys.assignmentDetails(assignmentId),
    queryFn: () =>
      trpc.assignments.getAssignmentDetails.query({ id: assignmentId }),
  });
}

export function useSchedule() {
  return useQuery({
    queryKey: queryKeys.schedule,
    queryFn: () => trpc.schedule.getScheduleData.query(),
  });
}

export function useStats(courseId?: string) {
  return useQuery({
    enabled: Boolean(courseId),
    queryKey: queryKeys.stats(courseId),
    queryFn: () =>
      trpc.statistics.getStatisticsPageData.query({ courseId: courseId || "" }),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => trpc.notifications.getNotifications.query(),
  });
}

export function useBookmarks() {
  return useQuery({
    queryKey: queryKeys.bookmarks,
    queryFn: () => trpc.bookmarks.getUserBookmarks.query(),
  });
}

export function useNotes() {
  return useQuery({
    queryKey: queryKeys.notes,
    queryFn: () => trpc.notes.getNotes.query(),
  });
}

export function useAttendanceOverview() {
  return useQuery({
    queryKey: queryKeys.attendance,
    queryFn: () => trpc.attendances.getAttendancePageData.query(),
  });
}

export function useTutorActivity() {
  return useQuery({
    queryKey: queryKeys.tutorActivity,
    queryFn: () =>
      trpc.users.getTutorActivityData.query({
        page: 1,
        limit: 8,
        search: "",
        filter: [],
      }),
  });
}

export function useTutorUsers() {
  return useQuery({
    queryKey: queryKeys.tutorUsers,
    queryFn: () =>
      trpc.users.getTutorManageUsersData.query({
        page: 1,
        limit: 8,
        search: "",
        filter: [],
        sort: "name",
        direction: "asc",
      }),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => trpc.users.getUserProfile.query(),
  });
}

export function useNotesActions() {
  const queryClient = useQueryClient();

  const saveNote = useMutation({
    mutationFn: (input: {
      category: "CLASS" | "ASSIGNMENT" | "DOUBT";
      objectId: string;
      description: string | null;
      tags: string[];
      causedObjects?: Record<string, string>;
    }) =>
      trpc.notes.updateNote.mutate({
        category: input.category,
        objectId: input.objectId,
        description: input.description,
        descriptionJson: null,
        tags: input.tags,
        causedObjects: input.causedObjects,
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.note(variables.objectId),
      });
    },
  });

  return {
    saveNote,
  };
}

export function useBookmarkActions() {
  const queryClient = useQueryClient();

  const toggleBookmark = useMutation({
    mutationFn: (input: {
      category: "ASSIGNMENT" | "CLASS" | "DOUBT" | "NOTIFICATION";
      objectId: string;
      causedObjects?: Record<string, string>;
    }) =>
      trpc.bookmarks.toggleBookmark.mutate({
        category: input.category,
        objectId: input.objectId,
        causedObjects: input.causedObjects,
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bookmark(variables.objectId),
      });
    },
  });

  return {
    toggleBookmark,
  };
}

export function useNotificationActions() {
  const queryClient = useQueryClient();

  const toggleRead = useMutation({
    mutationFn: (id: string) =>
      trpc.notifications.toggleNotificationAsReadStatus.mutate({ id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => trpc.notifications.markAllNotificationsAsRead.mutate(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });

  return {
    toggleRead,
    markAllRead,
  };
}
