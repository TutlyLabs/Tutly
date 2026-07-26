// todo: fix overall attendance for mentor exceeding 100%
import type { Prisma, Role } from "@tutly/db/browser";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@tutly/db";
import { createLogger } from "@tutly/logger";
import {
  isStaff,
  requireClassManageAccess,
  requireClassReadAccess,
  requireCourseReadAccess,
  requireStudentDataAccess,
  resolveTargetMentorUsername,
} from "../lib/authorization";
import {
  createTRPCRouter,
  permissionProcedure,
  protectedProcedure,
} from "../trpc";

const logger = createLogger("api:attendance");

type StudentData = {
  Duration: number;
  username: string;
  Joins?: Prisma.InputJsonValue;
};

export type AttendanceRecord = {
  username: string;
  name: string;
  mail: string | null;
  image: string | null;
  role: string;
  count: number;
};

export const attendanceRouter = createTRPCRouter({
  postAttendance: permissionProcedure("attendance", "create")
    .input(
      z.object({
        classId: z.string(),
        data: z.array(z.record(z.string(), z.unknown())),
        maxInstructionDuration: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cls = await requireClassManageAccess(ctx, input.classId);

      const parsedData = JSON.parse(
        JSON.stringify(input.data),
      ) as Array<StudentData>;

      // Attendance rows are keyed by a raw username from the payload; without
      // this the caller could write rows for users outside the course entirely.
      const usernames = [...new Set(parsedData.map((s) => s.username))];
      if (usernames.length > 0) {
        const enrolled = await ctx.db.enrolledUsers.findMany({
          where: { courseId: cls.courseId, username: { in: usernames } },
          select: { username: true },
        });
        const enrolledSet = new Set(enrolled.map((e) => e.username));
        if (usernames.some((username) => !enrolledSet.has(username))) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Attendance contains users not enrolled in this course",
          });
        }
      }

      const attendanceData: Array<Prisma.AttendanceCreateManyInput> =
        parsedData.map((student) => {
          const baseData = {
            classId: input.classId,
            username: student.username,
            attendedDuration: student.Duration,
            data: [student.Joins ?? {}] as Array<Prisma.InputJsonValue>,
          };

          if (student.Duration >= input.maxInstructionDuration) {
            return {
              ...baseData,
              attended: true,
            };
          }
          return baseData;
        });

      const postAttendance = await ctx.db.attendance.createMany({
        data: attendanceData,
      });

      return { success: true, data: postAttendance };
    }),

  getAttendanceForMentorByIdBarChart: permissionProcedure("attendance", "list")
    .input(
      z.object({
        id: z.string(),
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireCourseReadAccess(ctx, input.courseId);
      const mentorUsername = await resolveTargetMentorUsername(ctx, input.id);

      const attendance = await ctx.db.attendance.findMany({
        where: {
          user: {
            enrolledUsers: {
              some: {
                mentorUsername,
                courseId: input.courseId,
              },
            },
          },
          class: { courseId: input.courseId },
          attended: true,
        },
      });

      const getAllClasses = await ctx.db.class.findMany({
        where: {
          courseId: input.courseId,
        },
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const classes: Array<string> = [];
      const attendanceInEachClass: Array<number> = [];
      getAllClasses.forEach((classData) => {
        const dateStr = classData.createdAt
          .toISOString()
          .split("T")[0] as string;
        classes.push(dateStr);
        const tem = attendance.filter(
          (attendanceData) => attendanceData.classId === classData.id,
        );
        attendanceInEachClass.push(tem.length);
      });

      return { success: true, data: { classes, attendanceInEachClass } };
    }),

  getAttendanceForMentorBarChart: permissionProcedure("attendance", "list")
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      await requireCourseReadAccess(ctx, input.courseId);

      let attendance;
      if (currentUser.role === "MENTOR") {
        attendance = await ctx.db.attendance.findMany({
          where: {
            user: {
              enrolledUsers: {
                some: {
                  mentorUsername: currentUser.username,
                },
              },
            },
            attended: true,
            class: {
              course: {
                id: input.courseId,
              },
            },
          },
        });
      } else {
        attendance = await ctx.db.attendance.findMany({
          where: {
            attended: true,
            class: {
              courseId: input.courseId,
            },
          },
        });
      }

      const getAllClasses = await ctx.db.class.findMany({
        where: {
          courseId: input.courseId,
        },
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const classes: Array<string> = [];
      const attendanceInEachClass: Array<number> = [];
      getAllClasses.forEach((classData) => {
        const dateStr = classData.createdAt
          .toISOString()
          .split("T")[0] as string;
        classes.push(dateStr);
        const tem = attendance.filter(
          (attendanceData) => attendanceData.classId === classData.id,
        );
        attendanceInEachClass.push(tem.length);
      });

      return { success: true, data: { classes, attendanceInEachClass } };
    }),

  getAttedanceByClassId: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      await requireClassReadAccess(ctx, input.id);

      const attendance = await ctx.db.attendance.findMany({
        where: {
          classId: input.id,
          // A student may only see their own row; mentors are narrowed to
          // their mentees, staff see the whole class.
          ...(isStaff(currentUser)
            ? {}
            : currentUser.role === "MENTOR"
              ? {
                  user: {
                    enrolledUsers: {
                      some: { mentorUsername: currentUser.username },
                    },
                  },
                }
              : { username: currentUser.username }),
        },
      });

      return { success: true, data: attendance };
    }),

  getStudentAttendanceByClassId: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      await requireClassReadAccess(ctx, input.classId);

      // Check if any attendance has been uploaded for this class
      const attendanceCount = await ctx.db.attendance.count({
        where: {
          classId: input.classId,
        },
      });

      const attendanceUploaded = attendanceCount > 0;

      const attendance = await ctx.db.attendance.findFirst({
        where: {
          classId: input.classId,
          username: currentUser.username,
        },
        select: {
          username: true,
          attended: true,
          attendedDuration: true,
          data: true,
          user: {
            select: {
              name: true,
              image: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        data: attendance,
        attendanceUploaded,
      };
    }),

  getMyCourseAttendance: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const records = await ctx.db.attendance.findMany({
        where: {
          username: ctx.session.user.username,
          class: { courseId: input.courseId },
        },
        select: {
          classId: true,
          attended: true,
          attendedDuration: true,
        },
      });
      return { success: true, data: records };
    }),

  getAttendanceOfStudent: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireCourseReadAccess(ctx, input.courseId);
      await requireStudentDataAccess(ctx, input.id, input.courseId);

      const attendance = await ctx.db.attendance.findMany({
        where: {
          username: input.id,
          AND: {
            class: {
              course: {
                id: input.courseId,
              },
            },
          },
        },
        select: {
          class: {
            select: {
              createdAt: true,
            },
          },
        },
      });

      const attendanceDates: Array<string> = [];
      attendance.forEach((attendanceData) => {
        const dateStr = attendanceData.class.createdAt
          .toISOString()
          .split("T")[0] as string;
        attendanceDates.push(dateStr);
      });

      const getAllClasses = await ctx.db.class.findMany({
        where: {
          courseId: input.courseId,
        },
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const classes: Array<string> = [];
      getAllClasses.forEach((classData) => {
        const dateStr = classData.createdAt
          .toISOString()
          .split("T")[0] as string;
        if (!attendanceDates.includes(dateStr)) {
          classes.push(dateStr);
        }
      });

      return { success: true, data: { classes, attendanceDates } };
    }),

  deleteClassAttendance: permissionProcedure("attendance", "delete")
    .input(
      z.object({
        classId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireClassManageAccess(ctx, input.classId);

      const attendance = await ctx.db.attendance.deleteMany({
        where: {
          classId: input.classId,
        },
      });

      return { success: true, data: attendance };
    }),

  getTotalNumberOfClassesAttended: permissionProcedure(
    "attendance",
    "list",
  ).query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    let attendance;
    if (currentUser.role === "MENTOR") {
      attendance = await ctx.db.attendance.findMany({
        where: {
          user: {
            organizationId: currentUser.organizationId,
            enrolledUsers: {
              some: {
                mentorUsername: currentUser.username,
              },
            },
          },
        },
        select: {
          username: true,
          user: true,
          attended: true,
        },
      });
    } else {
      attendance = await ctx.db.attendance.findMany({
        where: {
          user: {
            role: "STUDENT",
            organizationId: currentUser.organizationId,
          },
        },
        select: {
          username: true,
          user: true,
          attended: true,
        },
      });
    }

    const groupByTotalAttendance: Record<string, AttendanceRecord> = {};

    attendance.forEach((attendanceData) => {
      if (attendanceData.attended && attendanceData.username) {
        const existingRecord = groupByTotalAttendance[
          attendanceData.username
        ] ?? {
          count: 0,
          username: attendanceData.username,
          name: attendanceData.user.name,
          mail: attendanceData.user.email,
          image: attendanceData.user.image,
          role: attendanceData.user.role,
        };
        groupByTotalAttendance[attendanceData.username] = {
          username: attendanceData.username,
          name: attendanceData.user.name,
          mail: attendanceData.user.email,
          image: attendanceData.user.image,
          role: attendanceData.user.role,
          count: existingRecord.count + 1,
        };
      }
    });

    return { success: true, data: groupByTotalAttendance };
  }),

  getAttendanceForLeaderbaord: permissionProcedure("attendance", "list").query(
    async ({ ctx }) => {
      const currentUser = ctx.session.user;

      const attendance = await ctx.db.attendance.findMany({
        where: {
          attended: true,
          user: { organizationId: currentUser.organizationId },
        },
        select: {
          user: {
            select: {
              username: true,
            },
          },
        },
      });

      const groupedAttendance = attendance.reduce(
        (acc: Record<string, number>, curr) => {
          const username = curr.user.username;
          acc[username] = (acc[username] ?? 0) + 1;
          return acc;
        },
        {},
      );

      return { success: true, data: groupedAttendance };
    },
  ),

  getAttendanceOfAllStudents: permissionProcedure(
    "attendance",
    "list",
  ).query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    const enrolledUsers = await ctx.db.enrolledUsers.findMany({
      where: {
        username: currentUser.username,
        user: {
          organizationId: currentUser.organization?.id,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const courseId = enrolledUsers[0]?.courseId ?? "";

    const totalAttendance = await serverActionOfgetTotalNumberOfClassesAttended(
      currentUser.username,
      currentUser.role,
      courseId,
    );
    const totalCount = await serverActionOftotatlNumberOfClasses(courseId);

    const jsonData = Object.entries(totalAttendance).map(([, value]) => ({
      username: value.username,
      name: value.name,
      mail: value.mail,
      image: value.image,
      role: value.role,
      percentage: (Number(value.count) * 100) / Number(totalCount),
    }));

    return { success: true, data: jsonData };
  }),

  viewAttendanceByClassId: permissionProcedure("attendance", "list")
    .input(
      z.object({
        classId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      await requireClassReadAccess(ctx, input.classId);

      const attendance =
        currentUser.role === "MENTOR"
          ? await ctx.db.attendance.findMany({
              where: {
                classId: input.classId,
                user: {
                  enrolledUsers: {
                    some: {
                      mentorUsername: currentUser.username,
                    },
                  },
                },
              },
              include: {
                user: {
                  select: {
                    name: true,
                    image: true,
                    email: true,
                    enrolledUsers: {
                      select: {
                        mentorUsername: true,
                      },
                    },
                  },
                },
              },
            })
          : await ctx.db.attendance.findMany({
              where: {
                classId: input.classId,
              },
              include: {
                user: {
                  select: {
                    name: true,
                    image: true,
                    email: true,
                    enrolledUsers: {
                      select: {
                        mentorUsername: true,
                      },
                    },
                  },
                },
              },
            });

      let present = 0;

      attendance.forEach((ele) => {
        if (ele.attended) {
          present++;
        }
      });

      // Get the course ID from the class
      const classData = await ctx.db.class.findUnique({
        where: { id: input.classId },
        select: { courseId: true },
      });

      // Get total enrolled students count for the course
      let totalEnrolledStudents = 0;
      let notAttendedStudents: Array<{
        username: string;
        user: {
          name: string;
          image: string | null;
          email: string | null;
          enrolledUsers: Array<{
            mentorUsername: string | null;
          }>;
        };
      }> = [];

      if (classData?.courseId) {
        if (currentUser.role === "MENTOR") {
          totalEnrolledStudents = await ctx.db.enrolledUsers.count({
            where: {
              courseId: classData.courseId,
              mentorUsername: currentUser.username,
            },
          });

          // Get students who haven't attended
          const enrolledStudents = await ctx.db.enrolledUsers.findMany({
            where: {
              courseId: classData.courseId,
              mentorUsername: currentUser.username,
            },
            include: {
              user: {
                select: {
                  username: true,
                  name: true,
                  image: true,
                  email: true,
                  enrolledUsers: {
                    select: {
                      mentorUsername: true,
                    },
                  },
                },
              },
            },
          });

          const attendedUsernames = new Set(attendance.map((a) => a.username));

          notAttendedStudents = enrolledStudents
            .filter((enrolled) => !attendedUsernames.has(enrolled.username))
            .map((enrolled) => ({
              username: enrolled.username,
              user: {
                name: enrolled.user.name,
                image: enrolled.user.image,
                email: enrolled.user.email,
                enrolledUsers: enrolled.user.enrolledUsers,
              },
            }));
        } else {
          totalEnrolledStudents = await ctx.db.enrolledUsers.count({
            where: {
              courseId: classData.courseId,
              user: {
                role: "STUDENT",
              },
            },
          });

          // Get students who haven't attended
          const enrolledStudents = await ctx.db.enrolledUsers.findMany({
            where: {
              courseId: classData.courseId,
              user: {
                role: "STUDENT",
              },
            },
            include: {
              user: {
                select: {
                  username: true,
                  name: true,
                  image: true,
                  email: true,
                  enrolledUsers: {
                    select: {
                      mentorUsername: true,
                    },
                  },
                },
              },
            },
          });

          const attendedUsernames = new Set(attendance.map((a) => a.username));

          notAttendedStudents = enrolledStudents
            .filter((enrolled) => !attendedUsernames.has(enrolled.username))
            .map((enrolled) => ({
              username: enrolled.username,
              user: {
                name: enrolled.user.name,
                image: enrolled.user.image,
                email: enrolled.user.email,
                enrolledUsers: enrolled.user.enrolledUsers,
              },
            }));
        }
      }

      return {
        success: true,
        data: {
          attendance,
          present,
          totalEnrolledStudents,
          notAttendedStudents,
        },
      };
    }),

  getAttendancePageData: protectedProcedure.query(async ({ ctx }) => {
    try {
      const currentUser = ctx.session.user;

      // Fetch courses with complex includes
      let courses = await ctx.db.course.findMany({
        where: {
          enrolledUsers: {
            some: {
              username: currentUser.username || "",
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
      courses.forEach((course) => {
        course.classes.sort((a, b) => {
          return Number(a.createdAt) - Number(b.createdAt);
        });
      });

      // Filter published courses for non-instructors
      if (currentUser.role !== "INSTRUCTOR") {
        const publishedCourses = courses.filter((course) => course.isPublished);
        courses = publishedCourses;
      }

      return {
        success: true,
        data: {
          courses,
          role: currentUser.role,
        },
      };
    } catch (error) {
      logger.error(
        { err: error, userId: ctx.session.user.id },
        "fetch attendance page data failed",
      );
      return {
        success: false,
        error: "Failed to fetch attendance page data",
      };
    }
  }),
});

// Helper functions
export async function serverActionOfgetTotalNumberOfClassesAttended(
  username: string,
  role: Role,
  courseId: string,
) {
  let attendance;
  if (role === "MENTOR") {
    attendance = await db.attendance.findMany({
      where: {
        user: {
          enrolledUsers: {
            some: {
              mentorUsername: username,
              courseId,
            },
          },
        },
      },
      select: {
        username: true,
        user: true,
        attended: true,
      },
    });
  } else {
    attendance = await db.attendance.findMany({
      where: {
        user: {
          role: "STUDENT",
        },
        class: {
          courseId,
        },
      },
      select: {
        username: true,
        user: true,
        attended: true,
      },
    });
  }

  const groupByTotalAttendance: Record<string, AttendanceRecord> = {};

  attendance.forEach((attendanceData) => {
    if (attendanceData.attended && attendanceData.username) {
      const existingRecord = groupByTotalAttendance[
        attendanceData.username
      ] ?? {
        count: 0,
        username: attendanceData.username,
        name: attendanceData.user.name,
        mail: attendanceData.user.email,
        image: attendanceData.user.image,
        role: attendanceData.user.role,
      };
      groupByTotalAttendance[attendanceData.username] = {
        username: attendanceData.username,
        name: attendanceData.user.name,
        mail: attendanceData.user.email,
        image: attendanceData.user.image,
        role: attendanceData.user.role,
        count: existingRecord.count + 1,
      };
    }
  });

  return groupByTotalAttendance;
}

export async function serverActionOftotatlNumberOfClasses(courseId: string) {
  const getAllClasses = await db.class.count({
    where: {
      courseId,
    },
  });

  return getAllClasses;
}
