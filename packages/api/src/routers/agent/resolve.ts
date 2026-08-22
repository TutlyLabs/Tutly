import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

const LIMIT = 10;

/**
 * Name-to-id lookup.
 *
 * Every other agent tool takes ids, and no human says "assignment
 * 3f9a-...". Without this the caller's only option is to pull a page-data blob
 * and scan it, which is exactly the token cost the agent surface exists to
 * avoid.
 *
 * Scoping is by enrolment and course membership rather than by role: a mentor
 * resolving a name must not learn about courses they are not part of.
 */
export const agentResolveRouter = createTRPCRouter({
  lookup: protectedProcedure
    .input(
      z.object({
        query: z.string().trim().min(1).max(200),
        kind: z
          .enum(["course", "class", "assignment", "any"])
          .default("any")
          .describe(
            "Narrow the search when the caller already knows the type.",
          ),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const query = input.query;
      const wants = (kind: "course" | "class" | "assignment") =>
        input.kind === "any" || input.kind === kind;

      // The set of courses this caller may see at all. Every other lookup is
      // constrained to it, so a title match can never leak across courses.
      const visibleCourses = await ctx.db.course.findMany({
        where: {
          OR: [
            { createdById: user.id },
            { courseAdmins: { some: { id: user.id } } },
            {
              enrolledUsers: {
                some: {
                  OR: [
                    { username: user.username },
                    { mentorUsername: user.username },
                  ],
                },
              },
            },
          ],
        },
        select: { id: true, title: true, isPublished: true },
      });

      const courseIds = visibleCourses.map((course) => course.id);
      const needle = query.toLowerCase();

      const courses = wants("course")
        ? visibleCourses
            .filter((course) => course.title.toLowerCase().includes(needle))
            .slice(0, LIMIT)
        : [];

      const classes =
        wants("class") && courseIds.length > 0
          ? await ctx.db.class.findMany({
              where: {
                courseId: { in: courseIds },
                title: { contains: query, mode: "insensitive" },
              },
              orderBy: { createdAt: "desc" },
              take: LIMIT,
              select: {
                id: true,
                title: true,
                courseId: true,
                classType: true,
                startTime: true,
              },
            })
          : [];

      const assignments =
        wants("assignment") && courseIds.length > 0
          ? await ctx.db.attachment.findMany({
              where: {
                title: { contains: query, mode: "insensitive" },
                OR: [
                  { courseId: { in: courseIds } },
                  { class: { courseId: { in: courseIds } } },
                ],
              },
              orderBy: { createdAt: "desc" },
              take: LIMIT,
              select: {
                id: true,
                title: true,
                classId: true,
                courseId: true,
                submissionMode: true,
                dueDate: true,
                class: { select: { id: true, title: true, courseId: true } },
              },
            })
          : [];

      return {
        query,
        courses,
        classes,
        assignments: assignments.map((assignment) => ({
          id: assignment.id,
          title: assignment.title,
          submissionMode: assignment.submissionMode,
          dueDate: assignment.dueDate,
          classId: assignment.classId,
          courseId: assignment.courseId ?? assignment.class?.courseId ?? null,
          className: assignment.class?.title ?? null,
        })),
        totalMatches: courses.length + classes.length + assignments.length,
      };
    }),

  /** Who the caller is and which courses they can act on. */
  whoami: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;

    const manageable = await ctx.db.course.findMany({
      where: {
        OR: [
          { createdById: user.id },
          { courseAdmins: { some: { id: user.id } } },
        ],
      },
      select: { id: true, title: true },
    });

    const enrolled = await ctx.db.enrolledUsers.findMany({
      where: {
        OR: [{ username: user.username }, { mentorUsername: user.username }],
        courseId: { not: null },
      },
      select: {
        courseId: true,
        mentorUsername: true,
        course: { select: { id: true, title: true } },
      },
    });

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      organization: user.organization
        ? { id: user.organization.id, name: user.organization.name }
        : null,
      authMethod: ctx.authMethod,
      manageableCourses: manageable,
      enrolledCourses: enrolled
        .filter((enrolment) => enrolment.course)
        .map((enrolment) => ({
          id: enrolment.course!.id,
          title: enrolment.course!.title,
          asMentor: enrolment.mentorUsername === user.username,
        })),
    };
  }),
});
