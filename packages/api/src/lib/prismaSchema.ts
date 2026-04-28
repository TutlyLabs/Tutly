// Prisma Schema for AI Query Generation
// This file contains the complete schema structure for AI to understand database relationships
// todo: update this schema
export const PRISMA_SCHEMA = `
// Enums
enum Role {
  INSTRUCTOR
  MENTOR
  STUDENT
  ADMIN
}

enum FileType {
  AVATAR
  ATTACHMENT
  NOTES
  OTHER
}

enum NotificationMedium {
  PUSH
  NOTIFICATION
  EMAIL
  WHATSAPP
  SMS
}

enum NotificationEvent {
  CLASS_CREATED
  ASSIGNMENT_CREATED
  ASSIGNMENT_REVIEWED
  LEADERBOARD_UPDATED
  DOUBT_RESPONDED
  ATTENDANCE_MISSED
  CUSTOM_MESSAGE
}

enum BookMarkCategory {
  ASSIGNMENT
  CLASS
  DOUBT
  NOTIFICATION
}

enum NoteCategory {
  CLASS
  ASSIGNMENT
  DOUBT
}

enum VideoType {
  DRIVE
  YOUTUBE
  ZOOM
}

enum attachmentType {
  ASSIGNMENT
  GITHUB
  ZOOM
  OTHERS
}

enum submissionMode {
  HTML_CSS_JS
  REACT
  EXTERNAL_LINK
  SANDBOX
  WORKSPACE
  GIT
}

enum pointCategory {
  RESPOSIVENESS
  STYLING
  OTHER
  TESTS
}

enum WorkspaceProviderType {
  LOCAL
  SSH
}

enum ServiceConnectionStatus {
  ACTIVE
  DISABLED
  ERROR
}

enum AssignmentArtifactKind {
  STARTER
  AUTOSAVE
  SUBMISSION
  TEST_REPORT
  LOG
  SCREENSHOT
  MIGRATION
}

enum AssignmentArtifactStatus {
  PENDING_UPLOAD
  STORED
  FAILED
}

enum AssignmentTestVisibility {
  VISIBLE
  HIDDEN
}

enum SubmissionTestRunStatus {
  QUEUED
  RUNNING
  PASSED
  FAILED
  ERROR
  CANCELLED
}

enum PortSessionStatus {
  OPEN
  CLOSED
  STALE
}

enum SubmissionReviewStatus {
  NEEDS_REVIEW
  REVIEWED
  CHANGES_REQUESTED
  AUTO_SCORED
}

enum EventCategory {
  ASSIGNMENT_SUBMISSION
  ASSIGNMENT_EVALUATION
  NEW_USER_GOOGLE_LOGIN
  USER_GOOGLE_LOGIN
  USER_CREDENTIAL_LOGIN
  ATTACHMENT_CREATION
  CLASS_CREATION
  STUDENT_ENROLLMENT_IN_COURSE
  DOUBT_CREATION
  DOUBT_RESPONSE
}

enum EventAttachmentType {
  YOUTUBE
  YOUTUBE_LIVE
  GMEET
  JIOMEET
  TEXT
  VIMEO
  VIDEOCRYPT
  DOCUMENT
  OTHER
}

// Models
model User {
  id                  String                @id @default(uuid())
  name                String
  username            String                @unique
  email               String?               @unique
  image               String?
  password            String?
  mobile              String?
  role                Role                  @default(STUDENT)
  organizationId      String?
  organization        Organization?         @relation(fields: [organizationId], references: [id])
  lastSeen            DateTime?
  emailVerified       DateTime?
  isProfilePublic     Boolean               @default(true)
  oneTimePassword     String                @default(dbgenerated("substring(md5(random()::text), 1, 8)"))
  isAdmin             Boolean               @default(false)
  disabledAt          DateTime?
  
  // Relations
  pushSubscriptions   PushSubscription[]
  account             Account[]
  course              Course[]              // Courses created by user
  profile             Profile?
  doubt               Doubt[]
  response            Response[]
  Attendence          Attendance[]
  enrolledUsers       EnrolledUsers[]       @relation(name: "user")
  assignedMentees     EnrolledUsers[]       @relation(name: "mentor")
  adminForCourses     Course[]              @relation("CourseAdmins")
  Session             Session[]
  Events              Events[]
  notificationsFor    Notification[]        @relation("notificationIntendedFor")
  notificationsCaused Notification[]        @relation("notificationCausedBy")
  bookMarks           BookMarks[]
  notes               Notes[]
  uploadedFiles       File[]                @relation("uploadedFiles")
  archivedFiles       File[]                @relation("archivedFiles")
  ScheduleEvent       ScheduleEvent[]
  serviceConnections  ServiceConnection[]
  portSessions        PortSession[]
  submissionReviews   SubmissionReview[]     @relation("SubmissionReviewer")
  createdArtifacts    AssignmentArtifact[]
  
  createdAt           DateTime              @default(now())
  updatedAt           DateTime              @updatedAt
}

model Organization {
  id        String   @id @default(uuid())
  orgCode   String   @unique
  name      String
  users     User[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Profile {
  id                   Int      @id @default(autoincrement())
  user                 User     @relation(fields: [userId], references: [id])
  userId               String   @unique
  dateOfBirth          DateTime?
  hobbies              String[]
  aboutMe              String?
  secondaryEmail       String?
  mobile               String?
  whatsapp             String?
  gender               String?
  tshirtSize           String?
  socialLinks          Json?    @default("{}")
  professionalProfiles Json?    @default("{}")
  academicDetails      Json?    @default("{}")
  experiences          Json[]
  address              Json?    @default("{}")
  documents            Json?    @default("{}")
  metadata             Json?    @default("{}")
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

model Course {
  id            String          @id @default(uuid())
  createdById   String
  createdBy     User            @relation(fields: [createdById], references: [id])
  title         String
  image         String?
  startDate     DateTime        @default(now())
  endDate       DateTime?
  isPublished   Boolean         @default(false)
  
  // Relations
  enrolledUsers EnrolledUsers[]
  classes       Class[]
  attachments   Attachment[]
  doubts        Doubt[]
  courseAdmins  User[]          @relation("CourseAdmins")
  ScheduleEvent ScheduleEvent[]
  
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
}

model EnrolledUsers {
  id             String       @id @default(uuid())
  username       String
  user           User         @relation(name: "user", fields: [username], references: [username])
  mentorUsername String?
  mentor         User?        @relation(name: "mentor", fields: [mentorUsername], references: [username])
  startDate      DateTime     @default(now())
  endDate        DateTime?
  courseId       String?
  course         Course?      @relation(fields: [courseId], references: [id])
  submission     submission[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  
  @@unique([username, courseId, mentorUsername])
}

model Class {
  id          String       @id @default(uuid())
  title       String       @default("class")
  video       Video        @relation(fields: [videoId], references: [id])
  videoId     String
  courseId    String?
  course      Course?      @relation(fields: [courseId], references: [id])
  folderId    String?
  Folder      Folder?      @relation(fields: [folderId], references: [id])
  
  // Relations
  attachments Attachment[]
  Attendence  Attendance[]
  
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model Attendance {
  id               String   @id @default(uuid())
  username         String
  user             User     @relation(fields: [username], references: [username])
  classId          String
  class            Class    @relation(fields: [classId], references: [id])
  attendedDuration Int?
  attended         Boolean  @default(false)
  data             Json[]
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  @@unique([username, classId])
}

model Attachment {
  id              String         @id @default(uuid())
  title           String         @default("Attachment")
  details         String?
  attachmentType  attachmentType
  link            String?
  maxSubmissions  Int?           @default(1)
  classId         String?
  class           Class?         @relation(fields: [classId], references: [id])
  courseId        String?
  course          Course?        @relation(fields: [courseId], references: [id])
  submissionMode  submissionMode @default(HTML_CSS_JS)
  sandboxTemplate String?        @db.Text
  workspaceConfig AssignmentConfig?
  artifacts       AssignmentArtifact[]
  testCases       AssignmentTestCase[]
  testRuns        SubmissionTestRun[]
  reviews         SubmissionReview[]
  dueDate         DateTime?
  
  // Relations
  submissions     submission[]
  
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model submission {
  id             String        @id @default(uuid())
  enrolledUserId String
  enrolledUser   EnrolledUsers @relation(fields: [enrolledUserId], references: [id])
  attachmentId   String
  assignment     Attachment    @relation(fields: [attachmentId], references: [id])
  data           Json?
  overallFeedback String?
  editTime       DateTime      @default(dbgenerated("(NOW() + '15 minutes'::interval)"))
  submissionLink String?
  submissionDate DateTime      @default(now())
  
  // Relations
  points         Point[]
  artifacts      AssignmentArtifact[]
  testRuns       SubmissionTestRun[]
  review         SubmissionReview?
  
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}

model Point {
  id           String        @id @default(uuid())
  category     pointCategory
  feedback     String?
  score        Int           @default(0)
  maxScore     Int?
  source       String?
  metadata     Json?         @default("{}")
  testRunId    String?
  submissions  submission?   @relation(fields: [submissionId], references: [id])
  submissionId String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  
  @@unique([submissionId, category])
}

model AssignmentConfig {
  id             String @id @default(uuid())
  assignmentId   String @unique
  assignment     Attachment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  framework      String?
  setupCommand   String?
  devCommand     String?
  testCommand    String?
  previewPorts   Int[] @default([])
  readonlyPaths  String[] @default([])
  grading        Json? @default("{}")
  publicTestMetadata Json? @default("{}")
  defaultProvider WorkspaceProviderType @default(LOCAL)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model AssignmentArtifact {
  id           String @id @default(uuid())
  assignmentId String?
  assignment   Attachment? @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  submissionId String?
  submission   submission? @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  kind         AssignmentArtifactKind
  bucket       String
  objectKey    String
  fileName     String?
  mimeType     String?
  sizeBytes    BigInt?
  checksum     String?
  manifest     Json? @default("{}")
  version      Int @default(1)
  isLatest     Boolean @default(true)
  status       AssignmentArtifactStatus @default(PENDING_UPLOAD)
  uploadedAt   DateTime?
  createdById  String?
  createdBy    User? @relation(fields: [createdById], references: [id])
  createdAt    DateTime @default(now())
  testCases    AssignmentTestCase[]

  @@index([assignmentId, kind])
  @@index([submissionId, kind])
  @@index([objectKey])
}

model AssignmentTestCase {
  id           String @id @default(uuid())
  assignmentId String
  assignment   Attachment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  title        String
  visibility   AssignmentTestVisibility @default(VISIBLE)
  command      String
  points       Int @default(1)
  timeoutMs    Int @default(120000)
  metadata     Json? @default("{}")
  artifactId   String?
  artifact     AssignmentArtifact? @relation(fields: [artifactId], references: [id])
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([assignmentId, visibility])
}

model SubmissionTestRun {
  id                  String @id @default(uuid())
  submissionId        String
  submission          submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  assignmentId        String
  assignment          Attachment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  serviceConnectionId String?
  serviceConnection   ServiceConnection? @relation(fields: [serviceConnectionId], references: [id])
  provider            WorkspaceProviderType @default(LOCAL)
  status              SubmissionTestRunStatus @default(QUEUED)
  trigger             String @default("manual")
  visiblePassed       Int @default(0)
  visibleTotal        Int @default(0)
  hiddenPassed        Int @default(0)
  hiddenTotal         Int @default(0)
  score               Int @default(0)
  maxScore            Int @default(0)
  outputSummary       Json? @default("{}")
  logsArtifactId      String?
  reportArtifactId    String?
  startedAt           DateTime?
  completedAt         DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([assignmentId, status])
  @@index([submissionId, createdAt])
}

model ServiceConnection {
  id                String @id @default(uuid())
  userId            String
  user              User @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider          WorkspaceProviderType
  name              String
  status            ServiceConnectionStatus @default(ACTIVE)
  config            Json? @default("{}")
  encryptedSecret   String? @db.Text
  lastCheckedAt     DateTime?
  lastError         String? @db.Text
  testRuns          SubmissionTestRun[]
  portSessions      PortSession[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([userId, provider])
}

model PortSession {
  id                  String @id @default(uuid())
  userId              String
  user                User @relation(fields: [userId], references: [id], onDelete: Cascade)
  assignmentId        String?
  assignment          Attachment? @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  submissionId        String?
  submission          submission? @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  serviceConnectionId String?
  serviceConnection   ServiceConnection? @relation(fields: [serviceConnectionId], references: [id])
  provider            WorkspaceProviderType @default(LOCAL)
  port                Int
  targetUrl           String?
  proxyPath           String
  status              PortSessionStatus @default(OPEN)
  lastHeartbeatAt     DateTime @default(now())
  expiresAt           DateTime?
  metadata            Json? @default("{}")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([userId, status])
  @@index([assignmentId, port])
}

model SubmissionReview {
  id           String @id @default(uuid())
  submissionId String @unique
  submission   submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  assignmentId String
  assignment   Attachment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  reviewerId   String?
  reviewer     User? @relation("SubmissionReviewer", fields: [reviewerId], references: [id])
  status       SubmissionReviewStatus @default(NEEDS_REVIEW)
  autoScore    Int?
  maxScore     Int?
  manualScore  Int?
  feedback     String? @db.Text
  testRunId    String?
  reviewedAt   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([assignmentId, status])
  @@index([reviewerId])
}

model Doubt {
  id          String     @id @default(uuid())
  title       String?
  description String?
  user        User       @relation(fields: [userId], references: [id])
  userId      String
  courseId    String?
  course      Course?    @relation(fields: [courseId], references: [id])
  
  // Relations
  response    Response[]
  
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model Response {
  id          String   @id @default(uuid())
  description String?
  user        User     @relation(fields: [userId], references: [id])
  userId      String
  doubt       Doubt    @relation(fields: [doubtId], references: [id], onDelete: Cascade)
  doubtId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Notification {
  id            String            @id @default(uuid())
  intendedFor   User              @relation("notificationIntendedFor", fields: [intendedForId], references: [id])
  intendedForId String
  mediumSent    NotificationMedium @default(PUSH)
  customLink    String?
  causedBy      User?             @relation("notificationCausedBy", fields: [causedById], references: [id])
  causedById    String?
  eventType     NotificationEvent
  message       String?           @db.Text
  causedObjects Json?             @default("{}")
  readAt        DateTime?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
}

model BookMarks {
  id            String           @id @default(uuid())
  category      BookMarkCategory
  objectId      String
  causedObjects Json?            @default("{}")
  user          User             @relation(fields: [userId], references: [id])
  userId        String
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
  
  @@unique([userId, objectId])
}

model Notes {
  id            String       @id @default(uuid())
  user          User         @relation(fields: [userId], references: [id])
  userId        String
  category      NoteCategory
  objectId      String
  causedObjects Json?        @default("{}")
  description   String?
  tags          String[]
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  @@unique([userId, objectId])
}

model ScheduleEvent {
  id          String            @id @default(uuid())
  title       String
  startTime   DateTime
  endTime     DateTime
  isPublished Boolean           @default(false)
  courseId    String?
  course      Course?           @relation(fields: [courseId], references: [id])
  createdById String
  createdBy   User              @relation(fields: [createdById], references: [id])
  
  // Relations
  attachments EventAttachment[]
  
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

model EventAttachment {
  id       String              @id @default(uuid())
  title    String
  type     EventAttachmentType
  details  String?
  link     String?
  ordering Int                 @default(1)
  eventId  String
  event    ScheduleEvent       @relation(fields: [eventId], references: [id], onDelete: Cascade)
  createdAt DateTime           @default(now())
  updatedAt DateTime           @updatedAt
}

// Additional utility models
model Video {
  id         String    @id @default(uuid())
  videoLink  String?
  videoType  VideoType
  timeStamps Json?
  class      Class[]
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}

model Folder {
  id        String   @id @default(uuid())
  title     String   @default("Folder")
  Class     Class[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model File {
  id            String   @id @default(uuid())
  name          String
  internalName  String
  associatingId String?
  fileType      FileType @default(OTHER)
  isPublic      Boolean  @default(false)
  publicUrl     String?
  isUploaded    Boolean  @default(false)
  uploadedById  String?
  uploadedBy    User?    @relation("uploadedFiles", fields: [uploadedById], references: [id])
  isArchived    Boolean  @default(false)
  archivedById  String?
  archivedBy    User?    @relation("archivedFiles", fields: [archivedById], references: [id])
  archiveReason String?  @db.Text
  archivedAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model PushSubscription {
  id        String   @id @default(uuid())
  endpoint  String   @unique
  p256dh    String
  auth      String
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([userId])
}

model Account {
  id                String  @id @default(uuid())
  type              String
  provider          String
  providerAccountId String
  token_type        String?
  refresh_token     String?
  access_token      String?
  id_token          String?
  scope             String?
  session_state     String?
  expires_at        Int?
  username          String?
  email             String?
  avatar_url        String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId            String
  
  @@unique([provider, providerAccountId])
}

model Session {
  id        String   @id @default(uuid())
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Events {
  id                  String        @id @default(uuid())
  message             String?
  eventCategory       EventCategory
  eventCategoryDataId String?
  causedById          String
  causedBy            User          @relation(fields: [causedById], references: [id])
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
}

model Holidays {
  id          String   @id @default(uuid())
  reason      String
  description String?
  startDate   DateTime
  endDate     DateTime
}
`.trim();

// Additional context for AI query generation
export const SCHEMA_CONTEXT = `
Key Relationships to Remember:
1. User -> EnrolledUsers -> Course: Users enroll in courses
2. Course -> Class -> Attendance: Classes belong to courses, attendance tracks class participation
3. Course/Class -> Attachment -> Submission: Assignments can be at course or class level
4. User -> Doubt -> Response: Users ask doubts, others respond
5. User -> Notification: Users receive notifications
6. User -> BookMarks/Notes: Users save bookmarks and notes
7. Attachment -> AssignmentConfig: Workspace assignments have config (commands, ports, grading)
8. Attachment -> AssignmentTestCase: Test cases (visible/hidden) for workspace assignments
9. submission -> AssignmentArtifact: ZIP artifacts (starter, autosave, submission)
10. submission -> SubmissionTestRun: Test execution records (visible/hidden scores)
11. submission -> SubmissionReview: Review status (NEEDS_REVIEW, REVIEWED, AUTO_SCORED)
12. User -> ServiceConnection: Workspace providers (LOCAL, SSH) with encrypted secrets
13. User -> PortSession: Dev server port forwarding sessions

Common Query Patterns:
- Find user's enrolled courses: enrolledUsers.some({ username: "user123" })
- Find user's assignments: through enrolledUsers and course/class attachments
- Find user's attendance: attendance records by username
- Find user's doubts: doubt records by userId
- Find user's notifications: notifications by intendedForId
- Find workspace config: assignmentConfig via attachment.workspaceConfig
- Find test runs: submissionTestRun via submission.testRuns or attachment.testRuns
- Find review queue: submissionReview with status filter, joined with submission/enrollment

Field Types to Remember:
- IDs are String (UUID)
- Dates are DateTime
- Arrays use [] notation
- Optional fields use ?
- Json fields store structured data
- Enums have specific values (Role.STUDENT, etc.)
`;
