export type CourseSummary = {
  id: string;
  title: string;
  image?: string | null;
  isPublished?: boolean;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  _count?: {
    classes?: number;
    enrolledUsers?: number;
  };
};

export type ClassSummary = {
  id: string;
  title: string;
  courseId?: string | null;
  classType?: "RECORDED" | "LIVE";
  liveProvider?: "ZOOM" | "GOOGLE_MEET" | null;
  meetingUrl?: string | null;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  createdAt?: string | Date;
  video?: {
    id?: string;
    videoLink?: string | null;
    videoType?: "DRIVE" | "YOUTUBE" | "ZOOM";
  };
  Folder?: {
    id: string;
    title: string;
  } | null;
  attachments?: AssignmentSummary[];
};

export type AssignmentSummary = {
  id: string;
  title: string;
  details?: string | null;
  link?: string | null;
  dueDate?: string | Date | null;
  createdAt?: string | Date;
  submissionMode?: string;
  submissions?: Array<{
    id: string;
    status?: string;
    points?: Array<{ score: number }>;
  }>;
  class?: ClassSummary & {
    course?: CourseSummary | null;
  };
};

export type ScheduleEvent = {
  type: "Assignment" | "Class" | "Holiday" | string;
  name: string;
  description?: string;
  startDate: string | Date;
  endDate: string | Date;
  link?: string;
};

export type NotificationItem = {
  id: string;
  eventType: string;
  message?: string | null;
  customLink?: string | null;
  readAt?: string | Date | null;
  createdAt?: string | Date;
};
