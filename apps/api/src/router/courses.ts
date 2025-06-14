import { z } from "zod";

import { db } from "@tutly/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export async function getEnrolledCourseIds(username: string) {
  const enrolledCourses = await db.enrolledUsers.findMany({
    where: {
      username: username,
      courseId: {
        not: null,
      },
    },
    select: {
      courseId: true,
    },
  });

  return enrolledCourses
    .map((enrolled) => enrolled.courseId)
    .filter((id): id is string => id !== null);
}

export async function getEnrolledCourses(username: string) {
  const courses = await db.course.findMany({
    where: {
      enrolledUsers: {
        some: {
          username: username,
        },
      },
    },
    include: {
      classes: true,
      createdBy: true,
      _count: {
        select: {
          classes: true,
        },
      },
    },
  });

  return { success: true, data: courses };
}

export async function getEnrolledCoursesById(id: string) {
  const courses = await db.course.findMany({
    where: {
      enrolledUsers: {
        some: {
          user: {
            id: id,
          },
        },
      },
    },
    include: {
      classes: true,
      createdBy: true,
      _count: {
        select: {
          classes: true,
        },
      },
    },
  });

  return { success: true, data: courses };
}

export async function getMentorCourses(username: string) {
  const courses = await db.course.findMany({
    where: {
      enrolledUsers: {
        some: {
          mentorUsername: username,
        },
      },
    },
    include: {
      classes: true,
      createdBy: true,
      _count: {
        select: {
          classes: true,
        },
      },
    },
  });

  return { success: true, data: courses };
}

export const coursesRouter = createTRPCRouter({
  getAllCourses: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;
    try {
      let courses;
      if (currentUser.role === "INSTRUCTOR") {
        courses = await ctx.db.course.findMany({
          where: {
            OR: [
              { createdById: currentUser.id },
              {
                enrolledUsers: {
                  some: {
                    username: currentUser.username,
                  },
                },
              },
            ],
          },
          include: {
            _count: {
              select: {
                classes: true,
              },
            },
          },
        });
      } else if (currentUser.role === "MENTOR") {
        courses = await ctx.db.course.findMany({
          where: {
            enrolledUsers: {
              some: {
                mentorUsername: currentUser.username,
              },
            },
          },
          include: {
            _count: {
              select: {
                classes: true,
              },
            },
          },
        });
      } else {
        courses = await ctx.db.course.findMany({
          where: {
            enrolledUsers: {
              some: {
                user: {
                  id: currentUser.id,
                },
              },
            },
          },
          include: {
            _count: {
              select: {
                classes: true,
              },
            },
          },
        });
      }

      return { success: true, data: courses };
    } catch (e) {
      console.error("Detailed error while fetching courses:", e);
      return {
        error: "Failed to fetch courses",
        details: e instanceof Error ? e.message : String(e),
      };
    }
  }),

  getCourseClasses: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const classes = await ctx.db.class.findMany({
        where: {
          courseId: input.id,
        },
        include: {
          course: true,
          video: true,
          attachments: true,
          Folder: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
      return { success: true, data: classes };
    }),

  foldersByCourseId: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const folders = await ctx.db.folder.findMany({
        where: {
          Class: {
            some: {
              courseId: input.id,
            },
          },
        },
        include: {
          _count: {
            select: {
              Class: true,
            },
          },
        },
      });
      return folders;
    }),

  getEnrolledCourses: protectedProcedure.query(async ({ ctx }) => {
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
        classes: true,
        createdBy: true,
        _count: {
          select: {
            classes: true,
          },
        },
        courseAdmins: true,
      },
    });

    courses.forEach((course) => {
      course.classes.sort((a, b) => {
        return Number(a.createdAt) - Number(b.createdAt);
      });
    });

    const publishedCourses = courses.filter((course) => course.isPublished);

    if (currentUser.role === "INSTRUCTOR") {
      return { success: true, data: courses };
    }
    return { success: true, data: publishedCourses };
  }),

  getCreatedCourses: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    const courseIds = await ctx.db.enrolledUsers
      .findMany({
        where: {
          username: currentUser.username,
          courseId: {
            not: null,
          },
        },
        select: {
          courseId: true,
        },
      })
      .then((enrolledCourses) =>
        enrolledCourses
          .map((enrolled) => enrolled.courseId)
          .filter((id): id is string => id !== null),
      );

    const courses = await ctx.db.course.findMany({
      where: {
        id: {
          in: courseIds,
        },
      },
      include: {
        classes: true,
        createdBy: true,
        _count: {
          select: {
            classes: true,
          },
        },
      },
    });

    courses.forEach((course) => {
      course.classes.sort((a, b) => {
        return Number(a.createdAt) - Number(b.createdAt);
      });
    });

    return { success: true, data: courses };
  }),

  getEnrolledCoursesById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const courses = await ctx.db.course.findMany({
        where: {
          enrolledUsers: {
            some: {
              user: {
                id: input.id,
              },
            },
          },
        },
        include: {
          classes: true,
          createdBy: true,
          _count: {
            select: {
              classes: true,
            },
          },
        },
      });
      return { success: true, data: courses };
    }),

  getMentorStudents: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (!currentUser.organization) {
        throw new Error("User must belong to an organization");
      }

      const students = await ctx.db.user.findMany({
        where: {
          role: "STUDENT",
          enrolledUsers: {
            some: {
              mentorUsername: currentUser.username,
              courseId: input.courseId,
            },
          },
          organization: {
            id: currentUser.organization.id,
          },
        },
        include: {
          course: true,
          enrolledUsers: true,
        },
        orderBy: {
          username: "asc",
        },
      });

      return { success: true, data: students };
    }),

  getMentorStudentsById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (!currentUser.organization) {
        throw new Error("User must belong to an organization");
      }

      const students = await ctx.db.user.findMany({
        where: {
          enrolledUsers: {
            some: {
              mentorUsername: input.id,
              courseId: input.courseId,
            },
          },
          organization: {
            id: currentUser.organization.id,
          },
        },
        include: {
          course: true,
          enrolledUsers: true,
        },
        orderBy: {
          username: "asc",
        },
      });

      return { success: true, data: students };
    }),

  getEnrolledStudents: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (!currentUser.organization) {
        throw new Error("User must belong to an organization");
      }

      const students = await ctx.db.user.findMany({
        where: {
          enrolledUsers: {
            some: {
              course: {
                id: input.courseId,
              },
            },
          },
          role: "STUDENT",
          organization: {
            id: currentUser.organization.id,
          },
        },
        include: {
          course: true,
          enrolledUsers: true,
        },
      });

      return { success: true, data: students };
    }),

  getAllStudents: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;
    if (!currentUser.organization) {
      throw new Error("User must belong to an organization");
    }

    const students = await ctx.db.user.findMany({
      where: {
        role: "STUDENT",
        organization: {
          id: currentUser.organization.id,
        },
      },
      include: {
        course: true,
        enrolledUsers: true,
      },
    });

    return { success: true, data: students };
  }),

  getEnrolledMentees: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (!currentUser.organization) {
        throw new Error("User must belong to an organization");
      }

      const students = await ctx.db.user.findMany({
        where: {
          role: "MENTOR",
          enrolledUsers: {
            some: {
              course: {
                id: input.courseId,
              },
            },
          },
          organization: {
            id: currentUser.organization.id,
          },
        },
        include: {
          course: true,
          enrolledUsers: true,
        },
      });

      return { success: true, data: students };
    }),

  createCourse: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        isPublished: z.boolean(),
        image: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (currentUser.role !== "INSTRUCTOR") return { error: "Unauthorized" };
      if (!input.title.trim()) {
        return { error: "Title is required" };
      }

      const newCourse = await ctx.db.course.create({
        data: {
          title: input.title,
          createdById: currentUser.id,
          isPublished: input.isPublished,
          image: input.image ?? null,
          enrolledUsers: {
            create: {
              username: currentUser.username,
            },
          },
        },
      });
      return { success: true, data: newCourse };
    }),

  updateCourse: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
        isPublished: z.boolean(),
        image: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.title.trim()) {
        return { error: "Title is required" };
      }

      const course = await ctx.db.course.update({
        where: {
          id: input.id,
        },
        data: {
          title: input.title,
          isPublished: input.isPublished,
          image: input.image ?? null,
        },
      });
      return { success: true, data: course };
    }),

  getMentorCourses: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    const courses = await ctx.db.course.findMany({
      where: {
        enrolledUsers: {
          some: {
            mentorUsername: currentUser.username,
          },
        },
      },
      include: {
        classes: true,
        createdBy: true,
        _count: {
          select: {
            classes: true,
          },
        },
      },
    });

    courses.forEach((course) => {
      course.classes.sort((a, b) => {
        return Number(a.createdAt) - Number(b.createdAt);
      });
    });

    return { success: true, data: courses };
  }),

  getClassDetails: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const classDetails = await ctx.db.class.findUnique({
          where: {
            id: input.id,
          },
          include: {
            video: true,
            attachments: true,
            Folder: true,
          },
        });

        if (!classDetails) {
          return { success: false, error: "Class not found" };
        }

        return { success: true, data: classDetails };
      } catch (error) {
        console.error("Error fetching class details:", error);
        return { success: false, error: "Failed to fetch class details" };
      }
    }),

  getCourseByCourseId: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: {
          id: input.id,
        },
      });
      return { success: true, data: course };
    }),

  enrollStudentToCourse: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        username: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;
        if (currentUser.role !== "INSTRUCTOR") {
          return { error: "Unauthorized to enroll student to course" };
        }

        const user = await ctx.db.user.findUnique({
          where: { username: input.username },
        });

        if (!user) {
          return { error: "User not found" };
        }

        const course = await ctx.db.course.findUnique({
          where: { id: input.courseId },
        });

        if (!course) {
          return { error: "Course not found" };
        }

        const existingEnrollment = await ctx.db.enrolledUsers.findFirst({
          where: {
            courseId: input.courseId,
            username: input.username,
          },
        });

        if (existingEnrollment) {
          return { error: "User is already enrolled in the course" };
        }

        const newEnrollment = await ctx.db.enrolledUsers.create({
          data: {
            courseId: input.courseId,
            username: input.username,
          },
        });

        await ctx.db.events.create({
          data: {
            eventCategory: "STUDENT_ENROLLMENT_IN_COURSE",
            causedById: currentUser.id,
            eventCategoryDataId: newEnrollment.id,
          },
        });

        return { success: true, data: newEnrollment };
      } catch {
        return { error: "Failed to enroll student" };
      }
    }),

  unenrollStudentFromCourse: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        username: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;
        if (currentUser.role !== "INSTRUCTOR") {
          return { error: "Unauthorized to unenroll student from course" };
        }

        const user = await ctx.db.user.findUnique({
          where: { username: input.username },
        });

        if (!user) {
          return { error: "User not found" };
        }

        const course = await ctx.db.course.findUnique({
          where: { id: input.courseId },
        });

        if (!course) {
          return { error: "Course not found" };
        }

        const existingEnrollment = await ctx.db.enrolledUsers.findFirst({
          where: {
            courseId: input.courseId,
            username: input.username,
          },
        });

        if (!existingEnrollment) {
          return { error: "User is not enrolled in the course" };
        }

        await ctx.db.enrolledUsers.delete({
          where: {
            id: existingEnrollment.id,
          },
        });

        return { success: true, data: existingEnrollment };
      } catch {
        return { error: "Failed to unenroll student" };
      }
    }),

  updateRole: protectedProcedure
    .input(
      z.object({
        username: z.string(),
        role: z.enum(["STUDENT", "MENTOR"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;
        if (currentUser.role !== "INSTRUCTOR") {
          return { error: "Unauthorized to update user role" };
        }

        const user = await ctx.db.user.findUnique({
          where: { username: input.username },
        });

        if (!user) {
          return { error: "User not found" };
        }

        const updatedUser = await ctx.db.user.update({
          where: {
            id: user.id,
          },
          data: {
            role: input.role,
          },
        });

        return { success: true, data: updatedUser };
      } catch {
        return { error: "Failed to update user role" };
      }
    }),

  updateMentor: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        username: z.string(),
        mentorUsername: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;
        if (currentUser.role !== "INSTRUCTOR") {
          return { error: "Unauthorized to update mentor" };
        }

        const enrolledUser = await ctx.db.enrolledUsers.findFirst({
          where: {
            courseId: input.courseId,
            username: input.username,
          },
        });

        if (!enrolledUser) {
          return { error: "User is not enrolled in the course" };
        }

        const updatedUser = await ctx.db.enrolledUsers.update({
          where: {
            id: enrolledUser.id,
          },
          data: {
            mentorUsername: input.mentorUsername,
          },
        });

        return { success: true, data: updatedUser };
      } catch {
        return { error: "Failed to update mentor" };
      }
    }),

  deleteCourse: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (currentUser.role !== "INSTRUCTOR") return { error: "Unauthorized" };

      try {
        await ctx.db.course.delete({
          where: {
            id: input.id,
            createdById: currentUser.id,
          },
        });

        return { success: true };
      } catch {
        return { error: "Failed to delete course" };
      }
    }),
});
