import { createTRPCRouter, protectedProcedure } from "../trpc";

export const certificatesRouter = createTRPCRouter({
  getStudentCertificateData: protectedProcedure.query(async ({ ctx }) => {
    try {
      const currentUser = ctx.session.user;

      if (currentUser.role !== "STUDENT") {
        return {
          success: false,
          error: "Only students can access certificates",
        };
      }

      const enrolledCourses = await ctx.db.enrolledUsers.findMany({
        where: {
          username: currentUser.username,
          user: {
            organizationId: currentUser.organizationId,
          },
        },
        select: {
          course: {
            select: {
              id: true,
              title: true,
              attachments: {
                where: {
                  attachmentType: "ASSIGNMENT",
                },
                select: {
                  id: true,
                  title: true,
                  submissions: {
                    where: {
                      enrolledUser: {
                        username: currentUser.username,
                      },
                      status: "SUBMITTED",
                    },
                    select: {
                      id: true,
                      points: {
                        select: {
                          score: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const courses = enrolledCourses.map((enrolledCourse) => {
        if (!enrolledCourse.course?.id || !enrolledCourse.course.title) {
          throw new Error("Course ID or title is missing");
        }

        const courseAssignments = enrolledCourse.course.attachments;
        const submissions = courseAssignments.flatMap((a) => a.submissions);

        const totalPoints = submissions.reduce(
          (acc, curr) =>
            acc + curr.points.reduce((acc, curr) => acc + curr.score, 0),
          0,
        );

        return {
          courseId: enrolledCourse.course.id,
          courseTitle: enrolledCourse.course.title,
          assignments: courseAssignments,
          assignmentsSubmitted: submissions.length,
          totalPoints,
          totalAssignments: courseAssignments.length,
        };
      });

      return {
        success: true,
        data: {
          courses,
          currentUser: {
            name: currentUser.name,
            username: currentUser.username,
          },
        },
      };
    } catch (error) {
      console.error("Error fetching student certificate data:", error);
      return {
        success: false,
        error: "Failed to fetch student certificate data",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }),
});
