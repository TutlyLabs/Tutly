import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

import {
  getEnrolledCourseIds,
  getEnrolledCourses,
  getEnrolledCoursesById,
  getMentorCourses,
} from "./courses";

export type AssignmentDetails = {
  sortedAssignments: Array<{
    id: string;
    enrolledUser: {
      username: string;
    };
  }>;
  notSubmittedMentees: Array<{
    username: string;
  }>;
  isCourseAdmin: boolean;
};

export const assignmentsRouter = createTRPCRouter({
  getAllAssignedAssignments: protectedProcedure.query(async ({ ctx }) => {
    try {
      const currentUser = ctx.session.user;

      return await ctx.db.course.findMany({
        where: {
          enrolledUsers: {
            some: {
              username: currentUser.username,
            },
          },
        },
        select: {
          id: true,
          classes: {
            select: {
              attachments: {
                where: {
                  attachmentType: "ASSIGNMENT",
                },
                include: {
                  class: true,
                  submissions: {
                    where: {
                      enrolledUser: {
                        username: currentUser.username,
                      },
                    },
                    include: {
                      points: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }),

  getAllAssignedAssignmentsByUserId: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const { data: courses } = await getEnrolledCoursesById(input.id);

        const coursesWithAssignments = await ctx.db.course.findMany({
          where: {
            enrolledUsers: {
              some: {
                user: {
                  username: input.id,
                },
              },
            },
          },
          select: {
            id: true,
            classes: {
              select: {
                attachments: {
                  where: {
                    attachmentType: "ASSIGNMENT",
                  },
                  include: {
                    class: true,
                    submissions: {
                      where: {
                        enrolledUser: {
                          user: {
                            username: input.id,
                          },
                        },
                      },
                      include: {
                        points: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

        return {
          courses: courses,
          coursesWithAssignments: coursesWithAssignments,
        };
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }),

  getAllAssignmentsForMentor: protectedProcedure.query(async ({ ctx }) => {
    try {
      const currentUser = ctx.session.user;

      const { data: courses } = await getMentorCourses(currentUser.username);

      const coursesWithAssignments = await ctx.db.course.findMany({
        where: {
          enrolledUsers: {
            some: {
              mentorUsername: currentUser.username,
            },
          },
        },
        select: {
          id: true,
          classes: {
            select: {
              attachments: {
                where: {
                  attachmentType: "ASSIGNMENT",
                  submissions: {
                    some: {
                      enrolledUser: {
                        mentorUsername: currentUser.username,
                      },
                    },
                  },
                },
                include: {
                  class: true,
                  submissions: {
                    where: {
                      enrolledUser: {
                        mentorUsername: currentUser.username,
                      },
                    },
                    include: {
                      points: true,
                    },
                  },
                },
              },
              createdAt: true,
            },
          },
        },
      });

      return { courses, coursesWithAssignments };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }),

  getAllAssignmentsForInstructor: protectedProcedure.query(async ({ ctx }) => {
    try {
      const currentUser = ctx.session.user;

      const { data: courses } = await getEnrolledCourses(currentUser.username);

      const coursesWithAssignments = await ctx.db.course.findMany({
        where: {
          id: {
            in: courses.map((course: { id: string }) => course.id),
          },
        },
        select: {
          id: true,
          classes: {
            select: {
              attachments: {
                where: {
                  attachmentType: "ASSIGNMENT",
                },
                include: {
                  class: true,
                  submissions: {
                    include: {
                      points: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      return { courses, coursesWithAssignments };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }),

  getAllAssignments: protectedProcedure.query(async ({ ctx }) => {
    try {
      const currentUser = ctx.session.user;

      const { data: courses } = await getEnrolledCourses(currentUser.username);

      return await ctx.db.attachment.findMany({
        where: {
          attachmentType: "ASSIGNMENT",
          courseId: {
            in: courses.map((course) => course.id),
          },
        },
        include: {
          course: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }),

  getAllAssignedAssignmentsForMentor: protectedProcedure.query(
    async ({ ctx }) => {
      try {
        const currentUser = ctx.session.user;

        const { data: courses } = await getEnrolledCoursesById(currentUser.id);

        const coursesWithAssignments = await ctx.db.course.findMany({
          where: {
            enrolledUsers: {
              some: {
                mentorUsername: currentUser.username,
              },
            },
          },
          select: {
            id: true,
            classes: {
              select: {
                attachments: {
                  where: {
                    attachmentType: "ASSIGNMENT",
                  },
                  include: {
                    class: true,
                    submissions: {
                      where: {
                        enrolledUser: {
                          user: {
                            id: currentUser.username,
                          },
                        },
                      },
                      include: {
                        points: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        return { courses, coursesWithAssignments };
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  ),

  getAllMentorAssignments: protectedProcedure.query(async ({ ctx }) => {
    try {
      const currentUser = ctx.session.user;

      const coursesWithAssignments = await ctx.db.course.findMany({
        where: {
          enrolledUsers: {
            some: {
              mentorUsername: currentUser.username,
            },
          },
        },
        select: {
          id: true,
          classes: {
            select: {
              attachments: {
                where: {
                  attachmentType: "ASSIGNMENT",
                },
                select: {
                  title: true,
                  submissions: {
                    where: {
                      enrolledUser: {
                        mentorUsername: currentUser.username,
                      },
                    },
                    select: {
                      points: true,
                      enrolledUser: {
                        include: {
                          user: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const submissions = await ctx.db.submission.findMany({
        where: {
          enrolledUser: {
            mentorUsername: currentUser.username,
          },
        },
        select: {
          points: true,
          enrolledUser: {
            include: {
              user: true,
            },
          },
        },
      });

      return { coursesWithAssignments, submissions };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }),

  getAllCreatedAssignments: protectedProcedure.query(async ({ ctx }) => {
    try {
      const currentUser = ctx.session.user;

      return await ctx.db.course.findMany({
        where: {
          createdById: currentUser.id,
        },
        select: {
          id: true,
          classes: {
            select: {
              attachments: {
                where: {
                  attachmentType: "ASSIGNMENT",
                },
                include: {
                  class: true,
                  submissions: {
                    where: {
                      enrolledUserId: currentUser.id,
                    },
                  },
                },
              },
            },
          },
        },
      });
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }),

  getAssignmentDetailsByUserId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;

        return await ctx.db.attachment.findUnique({
          where: {
            id: input.id,
          },
          include: {
            class: {
              include: {
                course: true,
              },
            },
            submissions: {
              where: {
                enrolledUser: {
                  user: {
                    id: currentUser.id,
                  },
                },
              },
              include: {
                enrolledUser: {
                  include: {
                    submission: true,
                  },
                },
                points: true,
              },
            },
          },
        });
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }),

  getAllAssignmentDetailsBy: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(
      async ({
        ctx,
        input,
      }): Promise<AssignmentDetails | { error: string }> => {
        try {
          const currentUser = ctx.session.user;
          if (!currentUser.organization) {
            return { error: "Unauthorized" };
          }

          const assignment = await ctx.db.attachment.findUnique({
            where: {
              id: input.id,
            },
            include: {
              class: {
                include: {
                  course: true,
                },
              },
              submissions: {
                where: {
                  enrolledUser: {
                    mentorUsername: currentUser.username,
                  },
                },
                include: {
                  enrolledUser: {
                    include: {
                      submission: true,
                    },
                  },
                  points: true,
                },
              },
            },
          });

          const mentees = await ctx.db.user.findMany({
            where: {
              enrolledUsers: {
                some: {
                  mentorUsername: currentUser.username,
                },
              },
              organization: {
                id: currentUser.organization.id,
              },
            },
          });

          const notSubmittedMentees = mentees.filter((mentee) => {
            return !assignment?.submissions.some(
              (submission) =>
                submission.enrolledUser.username === mentee.username,
            );
          });

          const sortedAssignments =
            assignment?.submissions.sort((a, b) => {
              if (b.enrolledUser.username > a.enrolledUser.username) {
                return -1;
              } else if (b.enrolledUser.username < a.enrolledUser.username) {
                return 1;
              } else {
                return 0;
              }
            }) ?? [];

          const isCourseAdmin = currentUser.adminForCourses.some(
            (course) => course.id === assignment?.courseId,
          );

          return {
            sortedAssignments,
            notSubmittedMentees,
            isCourseAdmin,
          };
        } catch (error) {
          return {
            error:
              error instanceof Error ? error.message : "Unknown error occurred",
          };
        }
      },
    ),

  getAllAssignmentDetailsForInstructor: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(
      async ({
        ctx,
        input,
      }): Promise<AssignmentDetails | { error: string }> => {
        try {
          const currentUser = ctx.session.user;
          if (!currentUser.organization) {
            return { error: "Unauthorized" };
          }

          const assignment = await ctx.db.attachment.findUnique({
            where: {
              id: input.id,
            },
            include: {
              class: {
                include: {
                  course: {
                    where: {
                      createdById: currentUser.id,
                    },
                  },
                },
              },
              submissions: {
                include: {
                  enrolledUser: {
                    include: {
                      submission: true,
                    },
                  },
                  points: true,
                },
              },
            },
          });

          const allStudents = await ctx.db.enrolledUsers.findMany({
            where: {
              courseId: {
                in: await getEnrolledCourseIds(currentUser.username),
              },
              mentorUsername: {
                not: null,
              },
              user: {
                organizationId: currentUser.organization.id,
              },
            },
          });

          const notSubmittedMentees = allStudents.filter((student) => {
            return !assignment?.submissions.some(
              (submission) =>
                submission.enrolledUser.username === student.username,
            );
          });

          const sortedAssignments =
            assignment?.submissions.sort((a, b) => {
              if (b.enrolledUser.username > a.enrolledUser.username) {
                return -1;
              } else if (b.enrolledUser.username < a.enrolledUser.username) {
                return 1;
              } else {
                return 0;
              }
            }) ?? [];

          const isCourseAdmin = currentUser.adminForCourses.some(
            (course) => course.id === assignment?.courseId,
          );

          return {
            sortedAssignments,
            notSubmittedMentees,
            isCourseAdmin,
          };
        } catch (error) {
          return {
            error:
              error instanceof Error ? error.message : "Unknown error occurred",
          };
        }
      },
    ),

  getAllAssignmentsByCourseId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;

        return await ctx.db.course.findMany({
          where: {
            id: input.id,
          },
          select: {
            id: true,
            classes: {
              select: {
                attachments: {
                  where: {
                    attachmentType: "ASSIGNMENT",
                  },
                  include: {
                    class: true,
                    submissions: {
                      where: {
                        enrolledUser: {
                          username: currentUser.username,
                        },
                      },
                    },
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }),

  getMentorPieChartData: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;

        let assignments, noOfTotalMentees;

        if (currentUser.role === "MENTOR") {
          assignments = await ctx.db.submission.findMany({
            where: {
              enrolledUser: {
                mentorUsername: currentUser.username,
                courseId: input.courseId,
              },
            },
            include: {
              points: true,
            },
          });
          noOfTotalMentees = await ctx.db.enrolledUsers.count({
            where: {
              mentorUsername: currentUser.username,
              courseId: input.courseId,
            },
          });
        } else {
          assignments = await ctx.db.submission.findMany({
            where: {
              assignment: {
                courseId: input.courseId,
              },
            },
            include: {
              points: true,
            },
          });
          noOfTotalMentees = await ctx.db.enrolledUsers.count({
            where: {
              courseId: input.courseId,
            },
          });
        }

        let assignmentsWithPoints = 0,
          assignmentsWithoutPoints = 0;
        assignments.forEach((assignment) => {
          if (assignment.points.length > 0) {
            assignmentsWithPoints += 1;
          } else {
            assignmentsWithoutPoints += 1;
          }
        });

        const noOfTotalAssignments = await ctx.db.attachment.count({
          where: {
            attachmentType: "ASSIGNMENT",
            courseId: input.courseId,
          },
        });

        const notSubmitted =
          noOfTotalAssignments * noOfTotalMentees -
          assignmentsWithPoints -
          assignmentsWithoutPoints;

        return [assignmentsWithPoints, assignmentsWithoutPoints, notSubmitted];
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }),

  getMentorPieChartById: protectedProcedure
    .input(z.object({ id: z.string(), courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const assignments = await ctx.db.submission.findMany({
          where: {
            enrolledUser: {
              mentorUsername: input.id,
            },
            assignment: {
              courseId: input.courseId,
            },
          },
          include: {
            points: true,
            assignment: {
              select: {
                maxSubmissions: true,
              },
            },
          },
        });

        // const noOfTotalMentees = await ctx.db.enrolledUsers.count({
        //   where: {
        //     mentorUsername: input.id,
        //     courseId: input.courseId,
        //   },
        // });

        let assignmentsWithPoints = 0,
          assignmentsWithoutPoints = 0;
        assignments.forEach((assignment) => {
          if (assignment.points.length > 0) {
            assignmentsWithPoints += 1;
          } else {
            assignmentsWithoutPoints += 1;
          }
        });

        const noOfTotalAssignments = await ctx.db.attachment.findMany({
          where: {
            attachmentType: "ASSIGNMENT",
            courseId: input.courseId,
          },
          select: {
            maxSubmissions: true,
          },
        });

        let totalAssignments = 0;
        noOfTotalAssignments.forEach((a) => {
          totalAssignments += a.maxSubmissions ?? 0;
        });

        const notSubmitted =
          totalAssignments - assignmentsWithPoints - assignmentsWithoutPoints;

        return {
          evaluated: assignments.length,
          underReview: assignmentsWithoutPoints,
          unsubmitted: notSubmitted,
          totalPoints: assignments.reduce(
            (total, assignment) =>
              total +
              assignment.points.reduce((sum, point) => sum + point.score, 0),
            0,
          ),
        };
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }),

  getSubmissionsForMentorByIdLineChart: protectedProcedure
    .input(z.object({ id: z.string(), courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const submissionCount = await ctx.db.attachment.findMany({
          where: {
            attachmentType: "ASSIGNMENT",
            courseId: input.courseId,
          },
          include: {
            submissions: {
              where: {
                enrolledUser: {
                  mentorUsername: input.id,
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        return {
          assignments: submissionCount.map((submission) => submission.title),
          countForEachAssignment: submissionCount.map(
            (submission) => submission.submissions.length,
          ),
        };
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }),

  getSubmissionsForMentorLineChart: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;

        const submissionCount = await ctx.db.attachment.findMany({
          where: {
            attachmentType: "ASSIGNMENT",
            courseId: input.courseId,
          },
          include: {
            submissions:
              currentUser.role === "MENTOR"
                ? {
                    where: {
                      enrolledUser: {
                        mentorUsername: currentUser.username,
                      },
                    },
                  }
                : true,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        return {
          assignments: submissionCount.map((submission) => submission.title),
          countForEachAssignment: submissionCount.map(
            (submission) => submission.submissions.length,
          ),
        };
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }),

  getStudentEvaluatedAssigments: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;

        const assignments = await ctx.db.submission.findMany({
          where: {
            enrolledUser: {
              username: currentUser.username,
            },
            assignment: {
              courseId: input.courseId,
            },
          },
          include: {
            points: true,
          },
        });

        const evaluatedAssignments = assignments.filter(
          (assignment) => assignment.points.length > 0,
        );

        const totalPoints = evaluatedAssignments.reduce(
          (total, assignment) =>
            total +
            assignment.points.reduce((sum, point) => sum + point.score, 0),
          0,
        );

        const noOfTotalAssignments = await ctx.db.attachment.findMany({
          where: {
            attachmentType: "ASSIGNMENT",
            courseId: input.courseId,
          },
          select: {
            maxSubmissions: true,
          },
        });

        const totalAssignments = noOfTotalAssignments.reduce(
          (total, assignment) => total + (assignment.maxSubmissions ?? 0),
          0,
        );

        return {
          evaluated: evaluatedAssignments.length,
          underReview: assignments.length - evaluatedAssignments.length,
          unsubmitted: totalAssignments - assignments.length,
          totalPoints,
        };
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }),

  getStudentEvaluatedAssigmentsForMentor: protectedProcedure
    .input(z.object({ id: z.string(), courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const assignments = await ctx.db.submission.findMany({
          where: {
            enrolledUser: {
              username: input.id,
            },
            assignment: {
              courseId: input.courseId,
            },
          },
          include: {
            points: true,
            assignment: {
              select: {
                maxSubmissions: true,
              },
            },
          },
        });

        const evaluatedAssignments = assignments.filter(
          (assignment) => assignment.points.length > 0,
        );

        const totalPoints = evaluatedAssignments.reduce(
          (total, assignment) =>
            total +
            assignment.points.reduce((sum, point) => sum + point.score, 0),
          0,
        );

        const noOfTotalAssignments = await ctx.db.attachment.findMany({
          where: {
            attachmentType: "ASSIGNMENT",
            courseId: input.courseId,
          },
          select: {
            maxSubmissions: true,
          },
        });

        const totalAssignments = noOfTotalAssignments.reduce(
          (total, assignment) => total + (assignment.maxSubmissions ?? 0),
          0,
        );

        return {
          evaluated: evaluatedAssignments.length,
          underReview: assignments.length - evaluatedAssignments.length,
          unsubmitted: totalAssignments - assignments.length,
          totalPoints,
        };
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }),

  getAssignmentDetails: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.db.attachment.findUnique({
          where: {
            id: input.id,
          },
          include: {
            class: {
              include: {
                course: true,
              },
            },
          },
        });
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }),

  getAssignmentDetailsForSubmission: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;

        const assignment = await ctx.db.attachment.findUnique({
          where: {
            id: input.id,
          },
          include: {
            class: {
              include: {
                course: true,
              },
            },
            submissions: {
              where: {
                enrolledUser: {
                  user: {
                    id: currentUser.id,
                  },
                },
              },
              include: {
                enrolledUser: {
                  include: {
                    submission: true,
                  },
                },
                points: true,
              },
            },
          },
        });

        if (!assignment) {
          return { error: "Assignment not Found" };
        }

        if (!assignment.class?.courseId) {
          return { error: "Course not found" };
        }

        const mentorDetails = await ctx.db.enrolledUsers.findFirst({
          where: {
            username: currentUser.username,
            courseId: assignment.class.courseId,
          },
          select: {
            mentor: {
              select: {
                username: true,
              },
            },
          },
        });

        return {
          assignment: {
            id: assignment.id,
            title: assignment.title,
            link: assignment.link,
            details: assignment.details,
            sandboxTemplate: assignment.sandboxTemplate,
            class: {
              id: assignment.class.id,
              title: assignment.class.title,
              courseId: assignment.class.courseId,
              course: {
                id: assignment.class.course?.id,
                title: assignment.class.course?.title,
              },
            },
            submissions: assignment.submissions.map((submission) => {
              return { id: submission.id };
            }),
            maxSubmissions: assignment.maxSubmissions,
          },
          mentorDetails,
        };
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }),

  submitAssignment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;

        const assignment = await ctx.db.attachment.findUnique({
          where: {
            id: input.id,
          },
          include: {
            class: {
              include: {
                course: true,
              },
            },
            submissions: {
              where: {
                enrolledUser: {
                  user: {
                    id: currentUser.id,
                  },
                },
              },
              include: {
                enrolledUser: {
                  include: {
                    submission: true,
                  },
                },
                points: true,
              },
            },
          },
        });

        if (!assignment) {
          return { error: "Assignment not Found" };
        }

        if (!assignment.class?.courseId) {
          return { error: "Course not found" };
        }

        const mentorDetails = await ctx.db.enrolledUsers.findFirst({
          where: {
            username: currentUser.username,
            courseId: assignment.class.courseId,
          },
          select: {
            mentor: {
              select: {
                username: true,
              },
            },
          },
        });

        return {
          assignment: {
            id: assignment.id,
            title: assignment.title,
            link: assignment.link,
            class: {
              id: assignment.class.id,
              title: assignment.class.title,
              courseId: assignment.class.courseId,
              course: {
                id: assignment.class.course?.id,
                title: assignment.class.course?.title,
              },
            },
            submissions: assignment.submissions.map((submission) => {
              return { id: submission.id };
            }),
            maxSubmissions: assignment.maxSubmissions,
          },
          currentUser: {
            username: currentUser.username,
            name: currentUser.name,
            email: currentUser.email,
          },
          mentorDetails,
        };
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }),

  getAssignmentsPageData: protectedProcedure.query(async ({ ctx }) => {
    try {
      const currentUser = ctx.session.user;

      const coursesData = await ctx.db.course.findMany({
        where: {
          enrolledUsers: {
            some: {
              username: currentUser.username,
            },
          },
        },
        include: {
          classes: true,
          createdBy: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              email: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          _count: {
            select: {
              classes: true,
            },
          },
          courseAdmins: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              email: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      // Sort classes by creation date
      coursesData.forEach((course) => {
        course.classes.sort((a, b) => {
          return Number(a.createdAt) - Number(b.createdAt);
        });
      });

      const publishedCourses = coursesData.filter(
        (course) => course.isPublished,
      );
      const courses =
        currentUser.role === "INSTRUCTOR" ? coursesData : publishedCourses;

      const assignments = await ctx.db.course.findMany({
        where: {
          enrolledUsers: {
            some: {
              username: currentUser.username,
            },
          },
        },
        select: {
          id: true,
          classes: {
            select: {
              attachments: {
                where: {
                  attachmentType: "ASSIGNMENT",
                },
                include: {
                  class: true,
                  submissions: {
                    where: {
                      enrolledUser: {
                        username: currentUser.username,
                      },
                    },
                    include: {
                      points: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      return {
        success: true,
        data: {
          courses,
          assignments,
        },
      };
    } catch (error) {
      console.error("Error fetching assignments page data:", error);
      return {
        success: false,
        error: "Failed to fetch assignments page data",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }),

  getAssignmentDetailData: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        username: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(10),
        selectedMentor: z.string().optional(),
        searchQuery: z.string().default(""),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;
        const {
          assignmentId,
          username,
          page,
          limit,
          selectedMentor,
          searchQuery,
        } = input;
        const skip = (page - 1) * limit;

        const baseInclude = {
          class: {
            select: {
              id: true,
              course: {
                select: {
                  id: true,
                  title: true,
                  createdById: true,
                },
              },
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              createdById: true,
            },
          },
        };

        let assignmentData: any = null;
        let totalCount = 0;

        if (currentUser.role === "INSTRUCTOR") {
          const [rawAssignmentData, countResult] = await Promise.all([
            ctx.db.attachment.findUnique({
              where: { id: assignmentId },
              include: {
                ...baseInclude,
                submissions: {
                  where: {
                    AND: [
                      selectedMentor && selectedMentor !== "all"
                        ? {
                            enrolledUser: {
                              mentorUsername: selectedMentor,
                            },
                          }
                        : {},
                      searchQuery
                        ? {
                            enrolledUser: {
                              username: {
                                contains: searchQuery,
                                mode: "insensitive",
                              },
                            },
                          }
                        : {},
                      username
                        ? {
                            enrolledUser: {
                              username: username,
                            },
                          }
                        : {},
                    ],
                  },
                  take: limit,
                  skip,
                  orderBy: { submissionDate: "desc" },
                  include: {
                    enrolledUser: {
                      select: {
                        username: true,
                        mentorUsername: true,
                      },
                    },
                    points: {
                      select: {
                        category: true,
                        score: true,
                      },
                    },
                  },
                },
                course: {
                  select: {
                    id: true,
                    title: true,
                    createdById: true,
                    classes: true,
                    enrolledUsers: {
                      where: {
                        user: {
                          organizationId: currentUser.organizationId,
                        },
                      },
                      select: {
                        username: true,
                        mentorUsername: true,
                      },
                    },
                  },
                },
              },
            }),
            ctx.db.submission.count({
              where: {
                attachmentId: assignmentId,
                AND: [
                  selectedMentor && selectedMentor !== "all"
                    ? {
                        enrolledUser: {
                          mentorUsername: selectedMentor,
                        },
                      }
                    : {},
                  searchQuery
                    ? {
                        enrolledUser: {
                          username: {
                            contains: searchQuery,
                            mode: "insensitive",
                          },
                        },
                      }
                    : {},
                  username
                    ? {
                        enrolledUser: {
                          username: username,
                        },
                      }
                    : {},
                ],
              },
            }),
          ]);

          assignmentData = rawAssignmentData;
          totalCount = countResult;
        } else if (currentUser.role === "MENTOR") {
          const [rawAssignmentData, countResult] = await Promise.all([
            ctx.db.attachment.findUnique({
              where: { id: assignmentId },
              include: {
                ...baseInclude,
                submissions: {
                  where: {
                    AND: [
                      {
                        enrolledUser: {
                          mentorUsername: currentUser.username,
                        },
                      },
                      username
                        ? {
                            enrolledUser: {
                              username: username,
                            },
                          }
                        : {},
                      searchQuery
                        ? {
                            enrolledUser: {
                              username: {
                                contains: searchQuery,
                                mode: "insensitive",
                              },
                            },
                          }
                        : {},
                    ],
                  },
                  take: limit,
                  skip,
                  orderBy: { submissionDate: "desc" },
                  include: {
                    enrolledUser: {
                      select: {
                        username: true,
                        mentorUsername: true,
                      },
                    },
                    points: {
                      select: {
                        category: true,
                        score: true,
                      },
                    },
                  },
                },
                course: {
                  select: {
                    id: true,
                    title: true,
                    createdById: true,
                    enrolledUsers: {
                      where: {
                        mentorUsername: currentUser.username,
                      },
                      select: {
                        username: true,
                        mentorUsername: true,
                      },
                    },
                  },
                },
              },
            }),
            ctx.db.submission.count({
              where: {
                attachmentId: assignmentId,
                AND: [
                  {
                    enrolledUser: {
                      mentorUsername: currentUser.username,
                    },
                  },
                  username
                    ? {
                        enrolledUser: {
                          username: username,
                        },
                      }
                    : {},
                  searchQuery
                    ? {
                        enrolledUser: {
                          username: {
                            contains: searchQuery,
                            mode: "insensitive",
                          },
                        },
                      }
                    : {},
                ],
              },
            }),
          ]);

          assignmentData = rawAssignmentData;
          totalCount = countResult;
        } else {
          // STUDENT role
          assignmentData = await ctx.db.attachment.findUnique({
            where: { id: assignmentId },
            include: {
              ...baseInclude,
              submissions: {
                where: {
                  enrolledUser: {
                    user: {
                      id: currentUser.id,
                    },
                  },
                },
                include: {
                  enrolledUser: {
                    select: {
                      username: true,
                      mentorUsername: true,
                    },
                  },
                  points: {
                    select: {
                      category: true,
                      score: true,
                    },
                  },
                },
              },
            },
          });
        }

        if (!assignmentData) {
          return { success: false, error: "Assignment not found" };
        }

        const notSubmittedMentees =
          assignmentData.course?.enrolledUsers?.filter(
            (enrolled: { username: string; mentorUsername: string | null }) =>
              !assignmentData.submissions?.some(
                (submission: { enrolledUser: { username: string } }) =>
                  submission.enrolledUser.username === enrolled.username,
              ),
          ) ?? [];

        const sortedAssignments = [...(assignmentData.submissions ?? [])].sort(
          (
            a: { enrolledUser: { username: string } },
            b: { enrolledUser: { username: string } },
          ) => a.enrolledUser.username.localeCompare(b.enrolledUser.username),
        );

        const isCourseAdmin =
          currentUser.role === "INSTRUCTOR"
            ? currentUser.id === assignmentData.course?.createdById
            : currentUser.adminForCourses.some(
                (course: { id: string }) =>
                  course.id === assignmentData.course?.id,
              );

        const totalPages = Math.ceil(totalCount / limit);

        const mentors = assignmentData?.course?.enrolledUsers
          ? Array.from(
              new Set(
                assignmentData.course.enrolledUsers
                  .map(
                    (user: { mentorUsername: string | null }) =>
                      user.mentorUsername,
                  )
                  .filter(Boolean),
              ),
            )
          : [];

        return {
          success: true,
          data: {
            assignment: assignmentData,
            assignments: sortedAssignments,
            notSubmittedMentees,
            isCourseAdmin,
            mentors: mentors as Array<string>,
            pagination: {
              currentPage: page,
              totalPages,
              pageSize: limit,
            },
          },
        };
      } catch (error) {
        console.error("Error fetching assignment detail data:", error);
        return {
          success: false,
          error: "Failed to fetch assignment detail data",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    }),

  getAssignmentEvaluateData: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        submissionId: z.string().optional(),
        username: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;
        const { assignmentId, submissionId, username } = input;

        if (currentUser.role === "STUDENT") {
          return {
            success: false,
            error: "Students cannot access evaluation page",
          };
        }

        const assignment = await ctx.db.attachment.findUnique({
          where: {
            id: assignmentId,
          },
          include: {
            class: {
              include: {
                course: true,
              },
            },
          },
        });

        const assignmenttemp = await ctx.db.attachment.findUnique({
          where: {
            id: assignmentId,
          },
        });

        const submissions = await ctx.db.submission.findMany({
          where: {
            attachmentId: assignmentId,
          },
          include: {
            enrolledUser: {
              include: {
                user: true,
              },
            },
            points: true,
            assignment: true,
          },
          orderBy: {
            enrolledUser: {
              username: "asc",
            },
          },
        });

        let filteredSubmissions: Array<any> = [];

        if (currentUser.role === "INSTRUCTOR") {
          filteredSubmissions = submissions;
        }

        if (currentUser.role === "MENTOR") {
          filteredSubmissions = submissions.filter(
            (submission) =>
              submission.enrolledUser.mentorUsername === currentUser.username,
          );
        }

        if (
          assignmenttemp?.maxSubmissions &&
          assignmenttemp.maxSubmissions > 1
        ) {
          const submissionCount = await ctx.db.submission.groupBy({
            by: ["enrolledUserId"],
            where: {
              attachmentId: assignmentId,
            },
            _count: {
              id: true,
            },
          });

          filteredSubmissions.forEach((submission) => {
            const submissionCountData = submissionCount.find(
              (data) => data.enrolledUserId === submission.enrolledUserId,
            );
            if (submissionCountData) {
              submission.submissionCount = submissionCountData._count.id;
            }
          });

          filteredSubmissions.forEach((submission) => {
            submission.submissionIndex = 1;
            if (submission.submissionCount && submission.submissionCount > 1) {
              const submissionIndex =
                submissions
                  .filter(
                    (sub) => sub.enrolledUserId === submission.enrolledUserId,
                  )
                  .findIndex((sub) => sub.id === submission.id) || 0;
              submission.submissionIndex = submissionIndex + 1;
            }
          });
        }

        if (username) {
          filteredSubmissions = filteredSubmissions.filter(
            (submission) => submission?.enrolledUser.username === username,
          );
        }

        const submission = filteredSubmissions.find(
          (submission) => submission?.id === submissionId,
        );

        return {
          success: true,
          data: {
            assignment,
            submissions: filteredSubmissions,
            submission,
          },
        };
      } catch (error) {
        console.error("Error fetching assignment evaluate data:", error);
        return {
          success: false,
          error: "Failed to fetch assignment evaluate data",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    }),

  getTutorStudentAssignmentsData: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;
        const { userId } = input;

        // Check if current user is a student (should redirect)
        if (currentUser.role === "STUDENT") {
          return {
            success: false,
            error: "Students cannot access this page",
            redirectTo: "/assignments",
          };
        }

        // Fetch simple courses for the user
        const courses = await ctx.db.course.findMany({
          where: {
            enrolledUsers: {
              some: {
                username: userId,
              },
            },
          },
          select: {
            id: true,
            title: true,
          },
        });

        // Fetch courses with assignments based on role
        const coursesWithAssignments = await ctx.db.course.findMany({
          where: {
            id: {
              in: courses.map((course) => course.id),
            },
            ...(currentUser.role === "MENTOR" && {
              classes: {
                some: {
                  attachments: {
                    some: {
                      submissions: {
                        some: {
                          enrolledUser: {
                            mentorUsername: currentUser.username,
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          },
          select: {
            id: true,
            title: true,
            image: true,
            startDate: true,
            endDate: true,
            isPublished: true,
            createdAt: true,
            updatedAt: true,
            createdById: true,
            classes: {
              select: {
                id: true,
                createdAt: true,
                attachments: {
                  where: {
                    attachmentType: "ASSIGNMENT",
                    ...(currentUser.role === "MENTOR" && {
                      submissions: {
                        some: {
                          enrolledUser: {
                            mentorUsername: currentUser.username,
                          },
                        },
                      },
                    }),
                  },
                  select: {
                    id: true,
                    title: true,
                    class: {
                      select: {
                        title: true,
                      },
                    },
                    submissions: {
                      where: {
                        enrolledUser: {
                          user: {
                            username: userId,
                          },
                        },
                        ...(currentUser.role === "MENTOR" && {
                          enrolledUser: {
                            mentorUsername: currentUser.username,
                          },
                        }),
                      },
                      select: {
                        id: true,
                        points: {
                          select: {
                            id: true,
                            score: true,
                          },
                        },
                        enrolledUser: {
                          select: {
                            mentorUsername: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

        // Sort assignments
        const sortedAssignments = coursesWithAssignments.map((course) => ({
          ...course,
          classes: course.classes
            .map((cls) => ({
              ...cls,
              attachments: cls.attachments.sort((a, b) =>
                a.title.localeCompare(b.title),
              ),
            }))
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            ),
        }));

        return {
          success: true,
          data: {
            courses,
            sortedAssignments,
            userId,
          },
        };
      } catch (error) {
        console.error("Error fetching tutor student assignments data:", error);
        return {
          success: false,
          error: "Failed to fetch tutor student assignments data",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    }),

  getByAssignmentPageData: protectedProcedure.query(async ({ ctx }) => {
    try {
      const currentUser = ctx.session.user;

      // Check if current user is a student (should redirect)
      if (currentUser.role === "STUDENT") {
        return {
          success: false,
          error: "Students cannot access this page",
          redirectTo: "/assignments",
        };
      }

      // Fetch simple courses for the user
      const courses = await ctx.db.course.findMany({
        where: {
          enrolledUsers: {
            some: {
              username: currentUser.username,
            },
          },
        },
        select: {
          id: true,
          title: true,
        },
      });

      // Fetch courses with assignments based on role
      const coursesWithAssignments = await ctx.db.course.findMany({
        where: {
          id: {
            in: courses.map((course) => course.id),
          },
          ...(currentUser.role === "MENTOR" && {
            classes: {
              some: {
                attachments: {
                  some: {
                    submissions: {
                      some: {
                        enrolledUser: {
                          mentorUsername: currentUser.username,
                        },
                      },
                    },
                  },
                },
              },
            },
          }),
        },
        select: {
          id: true,
          title: true,
          image: true,
          startDate: true,
          endDate: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
          classes: {
            select: {
              id: true,
              createdAt: true,
              attachments: {
                where: {
                  attachmentType: "ASSIGNMENT",
                  ...(currentUser.role === "MENTOR" && {
                    submissions: {
                      some: {
                        enrolledUser: {
                          mentorUsername: currentUser.username,
                        },
                      },
                    },
                  }),
                },
                select: {
                  id: true,
                  title: true,
                  class: {
                    select: {
                      title: true,
                    },
                  },
                  submissions: {
                    where: {
                      ...(currentUser.role === "MENTOR" && {
                        enrolledUser: {
                          mentorUsername: currentUser.username,
                        },
                      }),
                    },
                    select: {
                      id: true,
                      points: {
                        select: {
                          id: true,
                        },
                      },
                      enrolledUser: {
                        select: {
                          mentorUsername: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      // Sort assignments
      const sortedAssignments = coursesWithAssignments.map((course) => ({
        ...course,
        classes: course.classes
          .map((cls) => ({
            ...cls,
            attachments: cls.attachments.sort((a, b) =>
              a.title.localeCompare(b.title),
            ),
          }))
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          ),
      }));

      return {
        success: true,
        data: {
          courses,
          sortedAssignments,
        },
      };
    } catch (error) {
      console.error("Error fetching getByAssignment page data:", error);
      return {
        success: false,
        error: "Failed to fetch getByAssignment page data",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }),

  getAssignmentsDashboardData: protectedProcedure.query(async ({ ctx }) => {
    try {
      const currentUser = ctx.session.user;

      // Check if current user is a student (should redirect)
      if (currentUser.role === "STUDENT") {
        return {
          success: false,
          error: "Students cannot access this page",
          redirectTo: "/assignments",
        };
      }

      // Fetch students with complex includes
      const students = await ctx.db.user.findMany({
        where: {
          role: "STUDENT",
          organizationId: currentUser.organizationId,
          ...(currentUser.role === "MENTOR" && {
            enrolledUsers: {
              some: {
                mentorUsername: currentUser.username,
              },
            },
          }),
        },
        include: {
          course: true,
          enrolledUsers: true,
        },
      });

      // Fetch courses with complex includes
      const courses = await ctx.db.course.findMany({
        where: {
          ...(currentUser.role === "MENTOR"
            ? {
                enrolledUsers: {
                  some: {
                    mentorUsername: currentUser.username,
                  },
                },
              }
            : {
                enrolledUsers: {
                  some: {
                    username: currentUser.username,
                  },
                },
              }),
        },
        orderBy: {
          createdAt: "asc",
        },
        include: {
          classes: true,
          createdBy: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              email: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          _count: {
            select: {
              classes: true,
            },
          },
          courseAdmins: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              email: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      return {
        success: true,
        data: {
          students,
          courses,
          currentUser,
        },
      };
    } catch (error) {
      console.error("Error fetching assignments dashboard data:", error);
      return {
        success: false,
        error: "Failed to fetch assignments dashboard data",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }),
});
