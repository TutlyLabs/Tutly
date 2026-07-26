import { createTRPCRouter, protectedProcedure } from "../trpc";

export const scheduleRouter = createTRPCRouter({
  getScheduleData: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    const courses = await ctx.db.course.findMany({
      where: {
        enrolledUsers: {
          some: {
            username: currentUser.username,
          },
        },
      },
      include: {
        classes: {
          include: {
            attachments: {
              where: {
                attachmentType: "ASSIGNMENT",
              },
            },
          },
        },
      },
    });

    const holidays = await ctx.db.holidays.findMany({});

    const assignments = courses.flatMap((course) =>
      course.classes.flatMap((classItem) =>
        classItem.attachments.map((attachment) => {
          const createdAtDate = new Date(attachment.createdAt);
          const startDate = new Date(createdAtDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(createdAtDate);
          endDate.setHours(23, 59, 59, 999);

          return {
            type: "Assignment",
            name: attachment.title,
            description: `Assignment added on ${new Date(attachment.createdAt).toLocaleString()}`,
            startDate,
            endDate,
            link: `assignments/${attachment.id}`,
          };
        }),
      ),
    );

    const classEvents = courses.flatMap((course) =>
      course.classes.map((classItem) => ({
        type: "Class",
        name: classItem.title,
        description: `Session starts at ${new Date(classItem.createdAt).toLocaleString()}`,
        startDate: new Date(classItem.createdAt),
        endDate: new Date(classItem.createdAt.getTime() + 2000 * 60 * 60),
        link: `courses/${course.id}/classes/${classItem.id}`,
      })),
    );

    const holidayEvents = holidays.map((holiday) => {
      const startDate = new Date(holiday.startDate);
      const endDate = new Date(holiday.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      return {
        type: "Holiday",
        name: holiday.reason,
        description: holiday.description ?? "Observed holiday",
        startDate: startDate,
        endDate: endDate,
        link: "/schedule",
      };
    });

    const isAuthorized =
      currentUser.role === "INSTRUCTOR" ||
      currentUser.role === "MENTOR" ||
      false;
    const events = [...assignments, ...classEvents, ...holidayEvents];

    return {
      events,
      isAuthorized,
      holidays,
    };
  }),
});
