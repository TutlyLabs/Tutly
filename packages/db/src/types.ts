import type { roleEnum, user } from "./schema";
import type { 
  videoTypeEnum,
  bookmarkCategoryEnum,
  attachmentTypeEnum,
  submissionModeEnum
} from "./schema";

export type User = typeof user.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];

export type attachmentType = "ASSIGNMENT" | "GITHUB" | "ZOOM" | "OTHERS";
export type submissionMode = "HTML_CSS_JS" | "REACT" | "EXTERNAL_LINK";

export type VideoType = typeof videoTypeEnum.enumValues[number];
export type BookmarkCategory = typeof bookmarkCategoryEnum.enumValues[number];
export type AttachmentType = typeof attachmentTypeEnum.enumValues[number];
export type SubmissionMode = typeof submissionModeEnum.enumValues[number];
