import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "INSTRUCTOR",
  "MENTOR",
  "STUDENT",
  "ADMIN",
]);

export const fileTypeEnum = pgEnum("file_type", [
  "AVATAR",
  "ATTACHMENT",
  "NOTES",
  "OTHER",
]);

export const notificationMediumEnum = pgEnum("notification_medium", [
  "PUSH",
  "NOTIFICATION",
  "EMAIL",
  "WHATSAPP",
  "SMS",
]);

export const notificationEventEnum = pgEnum("notification_event", [
  "CLASS_CREATED",
  "ASSIGNMENT_CREATED",
  "ASSIGNMENT_REVIEWED",
  "LEADERBOARD_UPDATED",
  "DOUBT_RESPONDED",
  "ATTENDANCE_MISSED",
  "CUSTOM_MESSAGE",
]);

export const bookmarkCategoryEnum = pgEnum("bookmark_category", [
  "ASSIGNMENT",
  "CLASS",
  "DOUBT",
  "NOTIFICATION",
]);

export const noteCategoryEnum = pgEnum("note_category", [
  "CLASS",
  "ASSIGNMENT",
  "DOUBT",
]);

export const videoTypeEnum = pgEnum("video_type", ["DRIVE", "YOUTUBE", "ZOOM"]);

export const attachmentTypeEnum = pgEnum("attachment_type", [
  "ASSIGNMENT",
  "GITHUB",
  "ZOOM",
  "OTHERS",
]);

export const submissionModeEnum = pgEnum("submission_mode", [
  "HTML_CSS_JS",
  "REACT",
  "EXTERNAL_LINK",
]);

export const pointCategoryEnum = pgEnum("point_category", [
  "RESPOSIVENESS",
  "STYLING",
  "OTHER",
]);

export const eventAttachmentTypeEnum = pgEnum("event_attachment_type", [
  "YOUTUBE",
  "YOUTUBE_LIVE",
  "GMEET",
  "JIOMEET",
  "TEXT",
  "VIMEO",
  "VIDEOCRYPT",
  "DOCUMENT",
  "OTHER",
]);

// ... rest of the enums
