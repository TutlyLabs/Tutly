import { createTRPCRouter, protectedProcedure } from "../trpc";

export const driveRouter = createTRPCRouter({
  getUserFiles: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    return ctx.db.file.findMany({
      where: {
        uploadedById: currentUser.id,
        isArchived: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),
});
