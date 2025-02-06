import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { eq, sql, and, inArray, desc } from "drizzle-orm";
import { courses, doubts, responses } from "@tutly/db/schema";

export const doubtsRouter = createTRPCRouter({
  getUserDoubtsByCourseId: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const doubtsData = await ctx.db.query.doubts.findMany({
        where: eq(doubts.courseId, input.courseId),
        with: {
          user: true,
          course: true,
          responses: {
            with: { user: true },
            orderBy: desc(responses.createdAt)
          }
        }
      });
      return { success: true, data: doubtsData };
    }),

  createDoubt: protectedProcedure
    .input(z.object({ courseId: z.string(), title: z.string().optional(), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [doubt] = await ctx.db.insert(doubts)
        .values({
          courseId: input.courseId,
          userId: ctx.session.user.id,
          title: input.title ?? null,
          description: input.description ?? null
        })
        .returning();

      return { success: true, data: doubt };
    }),

  getEnrolledCoursesDoubts: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;
    
    const courses = await ctx.db.query.courses.findMany({
      where: sql`EXISTS (
        SELECT 1 FROM enrolled_users
        WHERE enrolled_users.course_id = courses.id
        AND enrolled_users.user_id = ${currentUser.id}
      )`,
      with: {
        doubts: {
          with: {
            user: true,
            responses: {
              with: { user: true }
            }
          }
        }
      }
    });
    return { success: true, data: courses };
  }),

  getCreatedCoursesDoubts: protectedProcedure.query(async ({ ctx }) => {
    const coursesRes = await ctx.db.query.courses.findMany({
      where: eq(courses.createdById, ctx.session.user.id),
      with: {
        doubts: {
          with: {
            user: true,
            responses: {
              with: { user: true }
            }
          }
        }
      }
    });
    return { success: true, data: coursesRes };
  }),

  getAllDoubtsForMentor: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;
    
    const mentorCourses = await ctx.db.query.courses.findMany({
      where: sql`EXISTS (
        SELECT 1 FROM enrolled_users
        WHERE enrolled_users.course_id = courses.id
        AND enrolled_users.mentor_username = ${currentUser.username}
      )`
    });

    const courseIds = mentorCourses.map(c => c.id);
    
    const coursesData = await ctx.db.query.courses.findMany({
      where: inArray(courses.id, courseIds),
      with: {
        doubts: {
          with: {
            user: true,
            responses: {
              with: { user: true }
            }
          }
        }
      }
    });
    
    return { success: true, data: coursesData };
  }),

  deleteDoubt: protectedProcedure
    .input(z.object({ doubtId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [deletedDoubt] = await ctx.db.delete(doubts)
        .where(and(
          eq(doubts.id, input.doubtId),
          eq(doubts.userId, ctx.session.user.id)
        ))
        .returning();
        
      return { 
        success: true, 
        data: deletedDoubt 
      };
    }),

  deleteAnyDoubt: protectedProcedure
    .input(z.object({ doubtId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doubt = await ctx.db.delete(doubts)
        .where(eq(doubts.id, input.doubtId));
      return { success: true, data: doubt };
    }),

  deleteResponse: protectedProcedure
    .input(z.object({ responseId: z.string() }))
    .mutation(async ({ ctx, input }) => {

      const response = await ctx.db.delete(responses)
        .where(eq(responses.id, input.responseId));
      return { success: true, data: response };
    }),

  createResponse: protectedProcedure
    .input(z.object({ doubtId: z.string(), description: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [response] = await ctx.db.insert(responses)
        .values({
          doubtId: input.doubtId,
          userId: ctx.session.user.id,
          description: input.description
        })
        .returning();

      return { success: true, data: response };
    }),
});
