import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  getEnrolledCourseIds,
  getEnrolledCourses,
  getEnrolledCoursesById,
  getMentorCourses,
} from "./courses";

export interface AssignmentDetails {
  sortedAssignments: {
    id: string;
    enrolledUser: {
      username: string;
    };
  }[];
  notSubmittedMentees: {
    username: string;
  }[];
  isCourseAdmin: boolean;
}

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
            in: courses.map((course) => course.id),
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
          evaluated: assignments.length || 0,
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
});
