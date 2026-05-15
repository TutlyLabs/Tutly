import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

const inputSchema = z.object({
  courseId: z.string().optional(),
  staleDays: z.number().int().min(1).max(365).default(7),
  recentDays: z.number().int().min(1).max(365).default(7),
});

export const glimpseRouter = createTRPCRouter({
  getCohortReport: protectedProcedure
    .input(inputSchema)
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      const isMentor = currentUser.role === "MENTOR";
      const isPrivileged =
        currentUser.role === "INSTRUCTOR" ||
        currentUser.role === "ADMIN" ||
        currentUser.role === "SUPER_ADMIN";

      if (!isPrivileged && !isMentor) {
        return {
          success: false as const,
          error: "Only instructors and mentors can view the cohort report",
        };
      }

      const orgId = currentUser.organizationId;
      let accessibleIds: string[] = [];

      if (isPrivileged) {
        const ownedCourses = await ctx.db.course.findMany({
          where: {
            OR: [
              { createdById: currentUser.id },
              { courseAdmins: { some: { id: currentUser.id } } },
            ],
            ...(orgId ? { createdBy: { organizationId: orgId } } : {}),
          },
          select: { id: true },
        });
        accessibleIds = ownedCourses.map((c) => c.id);
      } else {
        const mentorCourses = await ctx.db.enrolledUsers.findMany({
          where: { mentorUsername: currentUser.username },
          select: { courseId: true },
          distinct: ["courseId"],
        });
        accessibleIds = mentorCourses
          .map((m) => m.courseId)
          .filter((id): id is string => Boolean(id));
      }

      const courses = await ctx.db.course.findMany({
        where: {
          id: input.courseId
            ? { equals: input.courseId }
            : accessibleIds.length > 0
              ? { in: accessibleIds }
              : { in: [] },
        },
        select: {
          id: true,
          title: true,
          isPublished: true,
          _count: { select: { classes: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      if (input.courseId && !accessibleIds.includes(input.courseId)) {
        return {
          success: false as const,
          error: isMentor
            ? "You don't mentor anyone in this course"
            : "You don't manage this course",
        };
      }

      const now = new Date();
      const staleCutoff = new Date(
        now.getTime() - input.staleDays * 24 * 60 * 60 * 1000,
      );
      const recentCutoff = new Date(
        now.getTime() - input.recentDays * 24 * 60 * 60 * 1000,
      );

      const courseReports = await Promise.all(
        courses.map(async (course) => {
          const studentWhere = isMentor
            ? { courseId: course.id, mentorUsername: currentUser.username }
            : { courseId: course.id };
          const submissionWhere = isMentor
            ? {
                assignment: { courseId: course.id },
                status: "SUBMITTED" as const,
                enrolledUser: { mentorUsername: currentUser.username },
              }
            : {
                assignment: { courseId: course.id },
                status: "SUBMITTED" as const,
              };

          const [
            enrollments,
            assignments,
            submissions,
            latestClass,
            classesPendingAttendance,
            totalClasses,
          ] = await Promise.all([
              ctx.db.enrolledUsers.findMany({
                where: studentWhere,
                select: {
                  id: true,
                  username: true,
                  mentorUsername: true,
                  user: {
                    select: {
                      username: true,
                      name: true,
                      email: true,
                      role: true,
                      lastSeen: true,
                    },
                  },
                },
              }),
              ctx.db.attachment.findMany({
                where: {
                  courseId: course.id,
                  attachmentType: "ASSIGNMENT",
                },
                select: {
                  id: true,
                  title: true,
                  createdAt: true,
                  dueDate: true,
                  maxSubmissions: true,
                },
                orderBy: { createdAt: "asc" },
              }),
              ctx.db.submission.findMany({
                where: submissionWhere,
                select: {
                  id: true,
                  attachmentId: true,
                  submissionDate: true,
                  enrolledUser: {
                    select: { username: true, mentorUsername: true },
                  },
                  points: { select: { id: true } },
                },
              }),
              ctx.db.class.findFirst({
                where: { courseId: course.id },
                orderBy: { createdAt: "desc" },
                select: { id: true, title: true, createdAt: true },
              }),
              ctx.db.class.findMany({
                where: {
                  courseId: course.id,
                  Attendence: { none: {} },
                },
                select: { id: true, title: true, createdAt: true },
                orderBy: { createdAt: "desc" },
                take: 8,
              }),
              ctx.db.class.count({
                where: { courseId: course.id, Attendence: { none: {} } },
              }),
            ]);

          const students = enrollments.filter((e) => e.user.role === "STUDENT");
          const mentorEnrollments = enrollments.filter(
            (e) => e.user.role === "MENTOR",
          );
          const mentorUsernames = isMentor
            ? [currentUser.username]
            : Array.from(new Set(mentorEnrollments.map((m) => m.username)));

          const referencedMentorUsernames = Array.from(
            new Set(
              students
                .map((s) => s.mentorUsername)
                .filter((u): u is string => Boolean(u)),
            ),
          );
          const mentorProfiles = referencedMentorUsernames.length
            ? await ctx.db.user.findMany({
                where: { username: { in: referencedMentorUsernames } },
                select: { username: true, name: true, mobile: true },
              })
            : [];
          const mentorProfileByUsername = new Map(
            mentorProfiles.map((m) => [m.username, m]),
          );

          const submitters = new Set(
            submissions.map((s) => s.enrolledUser.username),
          );
          const totalSubs = submissions.length;
          const evaluatedSubs = submissions.filter(
            (s) => s.points.length > 0,
          ).length;
          const studentsWhoSubmitted = students.filter((s) =>
            submitters.has(s.username),
          ).length;
          const neverSignedIn = students.filter((s) => !s.user.lastSeen);
          const idleStudents = students.filter(
            (s) => s.user.lastSeen && s.user.lastSeen < staleCutoff,
          );
          const activeStudents = students.filter(
            (s) => s.user.lastSeen && s.user.lastSeen >= staleCutoff,
          ).length;
          const lastAssignment = assignments[assignments.length - 1] ?? null;

          const mentorBuckets = new Map<string | null, typeof students>();
          students.forEach((s) => {
            const key = s.mentorUsername ?? null;
            if (!mentorBuckets.has(key)) mentorBuckets.set(key, []);
            mentorBuckets.get(key)!.push(s);
          });

          const mentorRows = Array.from(mentorBuckets.entries())
            .map(([mentorKey, mentees]) => {
              const usernames = new Set(mentees.map((m) => m.username));
              const cohortSubs = submissions.filter((s) =>
                usernames.has(s.enrolledUser.username),
              );
              const recentSubs = cohortSubs.filter(
                (s) => s.submissionDate >= recentCutoff,
              );
              const submittersInCohort = new Set(
                cohortSubs.map((s) => s.enrolledUser.username),
              );
              const lastSub = cohortSubs.reduce<Date | null>(
                (acc, s) =>
                  acc && acc > s.submissionDate ? acc : s.submissionDate,
                null,
              );
              const profile = mentorKey
                ? mentorProfileByUsername.get(mentorKey)
                : null;
              const evaluated = cohortSubs.filter(
                (s) => s.points.length > 0,
              ).length;
              const totalSubs = cohortSubs.length;
              return {
                mentor: mentorKey ?? "(no mentor assigned)",
                mentorUsername: mentorKey,
                mentorName: profile?.name ?? null,
                mentorMobile: profile?.mobile ?? null,
                mentees: mentees.length,
                neverSignedIn: mentees.filter((m) => !m.user.lastSeen).length,
                idle: mentees.filter(
                  (m) => m.user.lastSeen && m.user.lastSeen < staleCutoff,
                ).length,
                neverSubmitted: mentees.filter(
                  (m) => !submittersInCohort.has(m.username),
                ).length,
                recentSubmitters: new Set(
                  recentSubs.map((s) => s.enrolledUser.username),
                ).size,
                avgSubs: mentees.length
                  ? cohortSubs.length / mentees.length
                  : 0,
                lastSubmission: lastSub ? lastSub.toISOString() : null,
                totalSubs,
                evaluated,
                pending: totalSubs - evaluated,
              };
            })
            .sort((a, b) => b.mentees - a.mentees);

          const totalEligible = students.length;
          const assignmentRows = assignments.map((a) => {
            const subs = submissions.filter((s) => s.attachmentId === a.id);
            const subUsernames = new Set(
              subs.map((s) => s.enrolledUser.username),
            );
            const evaluated = subs.filter((s) => s.points.length > 0).length;
            const studentSubmitters = students.filter((st) =>
              subUsernames.has(st.username),
            ).length;
            return {
              id: a.id,
              title: a.title,
              postedAt: a.createdAt.toISOString(),
              dueDate: a.dueDate ? a.dueDate.toISOString() : null,
              overdue: a.dueDate ? a.dueDate.getTime() < now.getTime() : false,
              submitted: studentSubmitters,
              totalEligible,
              evaluated,
              totalSubs: subs.length,
              pending: subs.length - evaluated,
              notSubmitted: Math.max(0, totalEligible - studentSubmitters),
            };
          });

          const neverSignedInList = neverSignedIn
            .map((s) => ({
              name: s.user.name,
              username: s.username,
              mentor: s.mentorUsername,
              email: s.user.email,
            }))
            .sort((a, b) =>
              (a.mentor ?? "zzz").localeCompare(b.mentor ?? "zzz"),
            );

          const neverSubmittedList = students
            .filter((s) => !submitters.has(s.username))
            .map((s) => ({
              name: s.user.name,
              username: s.username,
              mentor: s.mentorUsername,
              lastSeen: s.user.lastSeen ? s.user.lastSeen.toISOString() : null,
            }))
            .sort((a, b) => {
              if (!a.lastSeen && !b.lastSeen) return 0;
              if (!a.lastSeen) return -1;
              if (!b.lastSeen) return 1;
              return a.lastSeen.localeCompare(b.lastSeen);
            });

          const idleList = idleStudents
            .map((s) => ({
              name: s.user.name,
              username: s.username,
              mentor: s.mentorUsername,
              lastSeen: s.user.lastSeen ? s.user.lastSeen.toISOString() : null,
            }))
            .sort((a, b) =>
              (a.lastSeen ?? "").localeCompare(b.lastSeen ?? ""),
            );

          return {
            id: course.id,
            title: course.title,
            isPublished: course.isPublished,
            classesCount: course._count.classes,
            mentorsCount: mentorUsernames.length,
            studentsCount: students.length,
            assignmentsCount: assignments.length,
            latestClass: latestClass
              ? {
                  title: latestClass.title,
                  createdAt: latestClass.createdAt.toISOString(),
                }
              : null,
            latestAssignment: lastAssignment
              ? {
                  id: lastAssignment.id,
                  title: lastAssignment.title,
                  createdAt: lastAssignment.createdAt.toISOString(),
                }
              : null,
            totals: {
              submissions: totalSubs,
              evaluated: evaluatedSubs,
              pending: totalSubs - evaluatedSubs,
              studentsWhoSubmitted,
              activeStudents,
              idleStudents: idleStudents.length,
              neverSignedIn: neverSignedIn.length,
              classesPendingAttendance: totalClasses,
            },
            classesPendingAttendance: classesPendingAttendance.map((c) => ({
              id: c.id,
              title: c.title,
              createdAt: c.createdAt.toISOString(),
            })),
            mentorRows,
            assignmentRows,
            neverSignedInList,
            neverSubmittedList,
            idleList,
          };
        }),
      );

      return {
        success: true as const,
        viewerScope: isMentor ? ("mentor" as const) : ("instructor" as const),
        generatedAt: now.toISOString(),
        staleDays: input.staleDays,
        recentDays: input.recentDays,
        instructor: {
          name: currentUser.name ?? null,
          username: currentUser.username,
          organizationName: currentUser.organization?.name ?? null,
        },
        courses: courseReports,
      };
    }),
});
