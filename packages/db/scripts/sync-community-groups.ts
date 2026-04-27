/**
 * Populates / backfills community chat groups for every course.
 *
 *   1. COURSE group per course (announcement channel, postingPolicy =
 *      ADMINS_ONLY) populated with the course creator + every enrolled
 *      student + every assigned mentor. Course creator and mentors are
 *      ADMINs; students are MEMBERs.
 *   2. MENTOR group per (course, mentor) cohort populated with the mentor
 *      + course instructor + that mentor's assigned mentees. Mentor and
 *      instructor are ADMINs; mentees are MEMBERs.
 *
 * Re-running is safe: every operation is upsert-style and per-course
 * failures are isolated.
 *
 * Env flags:
 *   DRY_RUN=1  → log everything, mutate nothing
 *   VERBOSE=1  → log every operation (default: per-course summary only)
 *
 * Usage:
 *   bun run packages/db/scripts/sync-community-groups.ts
 *   DRY_RUN=1 bun run packages/db/scripts/sync-community-groups.ts
 */

import { PrismaPg } from "@prisma/adapter-pg";
import type { ChatGroup } from "../prisma/generated/client";
import { PrismaClient } from "../prisma/generated/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const DRY_RUN = process.env.DRY_RUN === "1";
const VERBOSE = process.env.VERBOSE === "1";

interface Stats {
  coursesProcessed: number;
  coursesSkipped: number;
  coursesErrored: number;
  courseGroupsCreated: number;
  courseGroupsBackfilled: number;
  mentorGroupsCreated: number;
  membershipsCreated: number;
  membershipsUpdated: number;
  membershipsSkipped: number;
  welcomeMessagesCreated: number;
}

const stats: Stats = {
  coursesProcessed: 0,
  coursesSkipped: 0,
  coursesErrored: 0,
  courseGroupsCreated: 0,
  courseGroupsBackfilled: 0,
  mentorGroupsCreated: 0,
  membershipsCreated: 0,
  membershipsUpdated: 0,
  membershipsSkipped: 0,
  welcomeMessagesCreated: 0,
};

const errors: Array<{ courseId: string; title: string; error: string }> = [];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  console.log("─────────────────────────────────────────────");
  console.log(" Community group sync");
  console.log(` DB host: ${redactedHost(dbUrl)}`);
  console.log(` Mode:    ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log("─────────────────────────────────────────────\n");

  // Sanity check: count expected work
  const totalCourses = await db.course.count();
  console.log(`Total courses in database: ${totalCourses}`);
  if (totalCourses === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Process courses in batches so we don't blow up memory.
  const BATCH_SIZE = 50;
  let processedTotal = 0;
  for (let skip = 0; skip < totalCourses; skip += BATCH_SIZE) {
    const courses = await db.course.findMany({
      skip,
      take: BATCH_SIZE,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        image: true,
        createdById: true,
        createdBy: {
          select: { id: true, disabledAt: true, organizationId: true },
        },
      },
    });
    for (const course of courses) {
      try {
        await processCourse(course);
        stats.coursesProcessed += 1;
      } catch (err) {
        stats.coursesErrored += 1;
        const message = err instanceof Error ? err.message : String(err);
        errors.push({
          courseId: course.id,
          title: course.title,
          error: message,
        });
        console.error(
          `\n❌ Course "${course.title}" (${course.id}) failed: ${message}`,
        );
      }
      processedTotal += 1;
      if (!VERBOSE) {
        process.stdout.write(
          `\r→ ${processedTotal}/${totalCourses} courses…`,
        );
      }
    }
  }
  if (!VERBOSE) process.stdout.write("\n");

  printSummary();
}

type CourseSummary = {
  id: string;
  title: string;
  image: string | null;
  createdById: string;
  createdBy: {
    id: string;
    disabledAt: Date | null;
    organizationId: string | null;
  } | null;
};

async function processCourse(course: CourseSummary) {
  // Skip if course creator is missing or disabled — we can't safely use them
  // as the createdBy / message sender.
  if (!course.createdBy) {
    log(`  skipping "${course.title}" — creator user not found`);
    stats.coursesSkipped += 1;
    return;
  }
  if (course.createdBy.disabledAt) {
    log(
      `  skipping "${course.title}" — creator is disabled, cannot use as senderId`,
    );
    stats.coursesSkipped += 1;
    return;
  }

  // ─── COURSE group ──────────────────────────────────────────────────
  let courseGroup = await db.chatGroup.findFirst({
    where: { courseId: course.id, type: "COURSE" },
  });

  if (!courseGroup) {
    courseGroup = await createCourseGroup(course);
    if (!courseGroup) return;
    stats.courseGroupsCreated += 1;
  } else if (
    courseGroup.archivedAt === null &&
    courseGroup.postingPolicy !== "ADMINS_ONLY"
  ) {
    if (!DRY_RUN) {
      await db.chatGroup.update({
        where: { id: courseGroup.id },
        data: { postingPolicy: "ADMINS_ONLY" },
      });
    }
    log(
      `  backfilled posting policy for "${course.title}" → ADMINS_ONLY`,
    );
    stats.courseGroupsBackfilled += 1;
  }

  if (courseGroup.archivedAt !== null) {
    log(`  course group for "${course.title}" is archived; skipping members`);
    return;
  }

  // ─── enrollments ──────────────────────────────────────────────────
  const enrollments = await db.enrolledUsers.findMany({
    where: { courseId: course.id },
    include: {
      user: { select: { id: true, disabledAt: true } },
      mentor: {
        select: { id: true, username: true, name: true, disabledAt: true },
      },
    },
  });

  // ─── COURSE group memberships ─────────────────────────────────────
  // Course creator → ADMIN
  await upsertMember(courseGroup.id, course.createdById, "ADMIN");

  // Distinct mentors → ADMIN (skipping disabled mentors)
  const mentorsByUsername = new Map<
    string,
    { id: string; username: string; name: string }
  >();
  for (const e of enrollments) {
    if (
      e.mentor &&
      e.mentor.disabledAt === null &&
      !mentorsByUsername.has(e.mentor.username)
    ) {
      mentorsByUsername.set(e.mentor.username, {
        id: e.mentor.id,
        username: e.mentor.username,
        name: e.mentor.name,
      });
    }
  }
  for (const m of mentorsByUsername.values()) {
    if (m.id === course.createdById) continue; // already added as creator
    await upsertMember(courseGroup.id, m.id, "ADMIN");
  }

  // Enrolled students → MEMBER (skipping disabled or missing)
  for (const e of enrollments) {
    if (!e.user || e.user.disabledAt) continue;
    if (e.user.id === course.createdById) continue;
    if (mentorsByUsername.has(e.mentorUsername ?? "__none__")) {
      // edge: a student who is also their own mentor (shouldn't happen, but
      // skip the duplicate). Mentors are already added above as ADMIN.
    }
    // If the user happens to also be an admin in this group (i.e. they got
    // added as a mentor), don't downgrade them.
    const existing = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: courseGroup.id, userId: e.user.id } },
      select: { role: true },
    });
    if (existing?.role === "ADMIN") continue;
    await upsertMember(courseGroup.id, e.user.id, "MEMBER");
  }

  // ─── MENTOR cohort groups (one per mentor in the course) ──────────
  const enrollmentsByMentor = groupByMentor(enrollments);
  for (const [mentorUsername, cohort] of enrollmentsByMentor) {
    const mentor = mentorsByUsername.get(mentorUsername);
    if (!mentor) {
      // mentor disabled / missing user — skip cohort
      log(`  mentor @${mentorUsername} unavailable; skipping cohort`);
      continue;
    }

    let mentorGroup = await db.chatGroup.findFirst({
      where: {
        courseId: course.id,
        type: "MENTOR",
        mentorUsername,
      },
    });

    if (!mentorGroup) {
      mentorGroup = await createMentorGroup(course, mentor);
      if (!mentorGroup) continue;
      stats.mentorGroupsCreated += 1;
    }

    if (mentorGroup.archivedAt !== null) continue;

    // Mentor → ADMIN
    await upsertMember(mentorGroup.id, mentor.id, "ADMIN");

    // Course instructor → ADMIN (skip if same person as mentor)
    if (course.createdById !== mentor.id) {
      await upsertMember(mentorGroup.id, course.createdById, "ADMIN");
    }

    // Mentees → MEMBER
    for (const e of cohort) {
      if (!e.user || e.user.disabledAt) continue;
      if (e.user.id === mentor.id || e.user.id === course.createdById) continue;
      await upsertMember(mentorGroup.id, e.user.id, "MEMBER");
    }
  }
}

function groupByMentor<T extends { mentorUsername: string | null }>(
  enrollments: T[],
): Map<string, T[]> {
  const result = new Map<string, T[]>();
  for (const e of enrollments) {
    if (!e.mentorUsername) continue;
    const arr = result.get(e.mentorUsername);
    if (arr) arr.push(e);
    else result.set(e.mentorUsername, [e]);
  }
  return result;
}

async function createCourseGroup(course: CourseSummary): Promise<ChatGroup | null> {
  if (DRY_RUN) {
    log(`  [dry] would create COURSE group for "${course.title}"`);
    return {
      id: "dry-run",
      name: course.title,
      description: null,
      type: "COURSE" as any,
      image: course.image,
      courseId: course.id,
      mentorUsername: null,
      postingPolicy: "ADMINS_ONLY" as any,
      organizationId: course.createdBy?.organizationId ?? null,
      createdById: course.createdById,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ChatGroup;
  }
  try {
    const group = await db.chatGroup.create({
      data: {
        name: course.title,
        description: "Course announcements from instructors and mentors.",
        type: "COURSE",
        image: course.image,
        courseId: course.id,
        postingPolicy: "ADMINS_ONLY",
        organizationId: course.createdBy?.organizationId ?? undefined,
        createdById: course.createdById,
      },
    });
    await safeCreateWelcome(
      group.id,
      course.createdById,
      `Welcome to ${course.title}!`,
    );
    return group;
  } catch (err) {
    // Race-condition fallback: another writer created the group in parallel.
    if ((err as { code?: string }).code === "P2002") {
      return db.chatGroup.findFirst({
        where: { courseId: course.id, type: "COURSE" },
      });
    }
    throw err;
  }
}

async function createMentorGroup(
  course: CourseSummary,
  mentor: { id: string; username: string; name: string },
): Promise<ChatGroup | null> {
  if (DRY_RUN) {
    log(
      `  [dry] would create MENTOR group "${course.title} · ${mentor.name}'s mentees"`,
    );
    return {
      id: "dry-run",
      name: `${course.title} · ${mentor.name}'s mentees`,
      description: null,
      type: "MENTOR" as any,
      image: course.image,
      courseId: course.id,
      mentorUsername: mentor.username,
      postingPolicy: "EVERYONE" as any,
      organizationId: course.createdBy?.organizationId ?? null,
      createdById: mentor.id,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ChatGroup;
  }
  try {
    const group = await db.chatGroup.create({
      data: {
        name: `${course.title} · ${mentor.name}'s mentees`,
        description: `Mentor cohort with ${mentor.name}. Anyone can post.`,
        type: "MENTOR",
        image: course.image,
        courseId: course.id,
        mentorUsername: mentor.username,
        postingPolicy: "EVERYONE",
        organizationId: course.createdBy?.organizationId ?? undefined,
        createdById: mentor.id,
      },
    });
    await safeCreateWelcome(
      group.id,
      mentor.id,
      `Mentor cohort created with ${mentor.name}.`,
    );
    return group;
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return db.chatGroup.findFirst({
        where: {
          courseId: course.id,
          type: "MENTOR",
          mentorUsername: mentor.username,
        },
      });
    }
    throw err;
  }
}

async function safeCreateWelcome(
  groupId: string,
  senderId: string,
  content: string,
) {
  try {
    await db.message.create({
      data: {
        groupId,
        senderId,
        content,
        type: "ACTIVITY",
        metadata: { event: "GROUP_CREATED" },
      },
    });
    stats.welcomeMessagesCreated += 1;
  } catch (err) {
    // Welcome messages are nice-to-have; don't fail the sync if it errors.
    const message = err instanceof Error ? err.message : String(err);
    log(`  welcome message failed (non-fatal): ${message}`);
  }
}

async function upsertMember(
  groupId: string,
  userId: string,
  desiredRole: "ADMIN" | "MEMBER",
) {
  if (DRY_RUN) {
    stats.membershipsCreated += 1;
    return;
  }
  try {
    // Idempotent: only upgrade MEMBER → ADMIN; never downgrade an existing
    // ADMIN to MEMBER, because instructors / course-admins explicitly given
    // ADMIN through other paths shouldn't lose privileges.
    const existing = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { role: true },
    });
    if (existing) {
      if (existing.role === "MEMBER" && desiredRole === "ADMIN") {
        await db.groupMember.update({
          where: { groupId_userId: { groupId, userId } },
          data: { role: "ADMIN" },
        });
        stats.membershipsUpdated += 1;
      } else {
        stats.membershipsSkipped += 1;
      }
      return;
    }
    await db.groupMember.create({
      data: { groupId, userId, role: desiredRole },
    });
    stats.membershipsCreated += 1;
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      // Race: another writer created the membership concurrently. Already
      // exists with whatever role they set — leave alone.
      stats.membershipsSkipped += 1;
      return;
    }
    throw err;
  }
}

function log(message: string) {
  if (VERBOSE) console.log(message);
}

function redactedHost(url: string) {
  try {
    const u = new URL(url);
    return u.host;
  } catch {
    return "(unparseable)";
  }
}

function printSummary() {
  console.log("\n─────────────────────────────────────────────");
  console.log(" Summary");
  console.log("─────────────────────────────────────────────");
  console.log(` Courses processed:        ${stats.coursesProcessed}`);
  console.log(` Courses skipped:          ${stats.coursesSkipped}`);
  console.log(` Courses errored:          ${stats.coursesErrored}`);
  console.log(` COURSE groups created:    ${stats.courseGroupsCreated}`);
  console.log(` COURSE groups backfilled: ${stats.courseGroupsBackfilled}`);
  console.log(` MENTOR groups created:    ${stats.mentorGroupsCreated}`);
  console.log(` Memberships created:      ${stats.membershipsCreated}`);
  console.log(` Memberships role-updated: ${stats.membershipsUpdated}`);
  console.log(` Memberships unchanged:    ${stats.membershipsSkipped}`);
  console.log(` Welcome messages:         ${stats.welcomeMessagesCreated}`);
  if (DRY_RUN) console.log("\n (DRY RUN — no writes were performed)");
  if (errors.length > 0) {
    console.log(`\n${errors.length} courses errored:`);
    for (const e of errors)
      console.log(`  - ${e.title} (${e.courseId}): ${e.error}`);
  }
  console.log("");
}

main()
  .catch((err) => {
    console.error("\n❌ Sync aborted:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
