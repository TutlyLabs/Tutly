import { createLogger } from "@tutly/logger";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const logger = createLogger("api:drive");

export const driveRouter = createTRPCRouter({
  getUserFiles: protectedProcedure.query(async ({ ctx }) => {
    try {
      const currentUser = ctx.session.user;

      const uploadedFiles = await ctx.db.file.findMany({
        where: {
          uploadedById: currentUser.id,
          isArchived: false,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        success: true,
        data: uploadedFiles,
      };
    } catch (error) {
      logger.error(
        { err: error, userId: ctx.session.user.id },
        "fetch user files failed",
      );
      return {
        success: false,
        error: "Failed to fetch user files",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }),
});
