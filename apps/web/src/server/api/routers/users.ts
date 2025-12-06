import type { Role } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const generateRandomPassword = (length = 8) => {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  let password = "";
  password += lowercase[Math.floor(Math.random() * lowercase.length)]; // 1 lowercase
  password += uppercase[Math.floor(Math.random() * uppercase.length)]; // 1 uppercase
  password += numbers[Math.floor(Math.random() * numbers.length)]; // 1 number
  password += symbols[Math.floor(Math.random() * symbols.length)]; // 1 symbol

  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

export const usersRouter = createTRPCRouter({
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    const user = await ctx.db.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        image: true,
        username: true,
        name: true,
        email: true,
      },
    });
    return user;
  }),

  getAllEnrolledUsers: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (!currentUser.organization) {
        throw new Error("Organization not found");
      }
      const enrolledUsers = await ctx.db.user.findMany({
        where: {
          role: "STUDENT",
          organizationId: currentUser.organization.id,
          enrolledUsers: {
            some: {
              courseId: input.courseId,
            },
          },
        },
        select: {
          id: true,
          image: true,
          username: true,
          name: true,
          email: true,
        },
      });

      return enrolledUsers;
    }),

  getAllUsers: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (!currentUser.organization) {
        throw new Error("Organization not found");
      }

      const globalUsers = await ctx.db.user.findMany({
        where: {
          organizationId: currentUser.organization.id,
        },
        select: {
          id: true,
          image: true,
          username: true,
          name: true,
          email: true,
          role: true,
          enrolledUsers: {
            where: {
              courseId: input.courseId,
            },
            select: {
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
              mentorUsername: true,
            },
          },
        },
      });
      return globalUsers;
    }),

  updateUserProfile: protectedProcedure
    .input(
      z.object({
        profile: z
          .object({
            mobile: z.string(),
            whatsapp: z.string(),
            gender: z.string(),
            tshirtSize: z.string(),
            secondaryEmail: z.string(),
            dateOfBirth: z
              .union([z.date(), z.string()])
              .transform((val) =>
                typeof val === "string" ? new Date(val) : val,
              )
              .nullable(),
            hobbies: z.array(z.string()),
            aboutMe: z.string(),
            socialLinks: z.record(z.string()),
            professionalProfiles: z.record(z.string()),
            academicDetails: z.record(z.string()),
            experiences: z.array(z.record(z.any())),
            address: z.record(z.string()),
            documents: z.record(z.string()),
          })
          .partial(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      const defaultValues = {
        userId: currentUser.id,
        mobile: null,
        whatsapp: null,
        gender: null,
        tshirtSize: null,
        secondaryEmail: null,
        dateOfBirth: null,
        hobbies: [],
        aboutMe: null,
        socialLinks: {},
        professionalProfiles: {},
        academicDetails: {},
        experiences: [],
        address: {},
        documents: {},
      };

      const createData = {
        ...defaultValues,
        ...Object.fromEntries(
          Object.entries(input.profile).map(([key, value]) => [
            key,
            value ?? defaultValues[key as keyof typeof defaultValues],
          ]),
        ),
      };

      const updateData = Object.fromEntries(
        Object.entries(input.profile).map(([key, value]) => [key, value]),
      );

      const updatedProfile = await ctx.db.profile.upsert({
        where: { userId: currentUser.id },
        create: createData,
        update: updateData,
      });

      return updatedProfile;
    }),

  updateUserAvatar: protectedProcedure
    .input(
      z.object({
        avatar: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      const updatedProfile = await ctx.db.user.update({
        where: { id: currentUser.id },
        data: { image: input.avatar },
      });

      return updatedProfile;
    }),

  createUser: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        username: z.string(),
        email: z.string(),
        password: z.string(),
        role: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session.user.organization) {
          throw new Error("Organization not found");
        }

        const user = await ctx.db.$transaction(async (tx) => {
          const createdUser = await tx.user.create({
            data: {
              name: input.name,
              username: input.username,
              email: input.email,
              role: input.role as Role,
              organization: {
                connect: { id: ctx.session.user.organization?.id },
              },
              oneTimePassword: generateRandomPassword(8),
            },
          });

          const hashedPassword = await bcrypt.hash(input.password, 10);

          await tx.account.create({
            data: {
              accountId: createdUser.id,
              userId: createdUser.id,
              providerId: "credential",
              password: hashedPassword,
            },
          });

          return createdUser;
        });

        return user;
      } catch {
        throw new Error("Failed to create user");
      }
    }),

  updateUser: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        username: z.string(),
        email: z.string(),
        role: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session.user.organization) {
          throw new Error("Organization not found");
        }

        const user = await ctx.db.user.update({
          where: { id: input.id },
          data: {
            name: input.name,
            username: input.username,
            email: input.email,
            role: input.role as Role,
          },
        });
        return user;
      } catch {
        throw new Error("Failed to update user");
      }
    }),

  deleteUser: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.user.delete({ where: { id: input.id } });
      } catch {
        throw new Error("Failed to delete user");
      }
    }),

  getUser: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const user = await ctx.db.user.findUnique({
          where: { id: input.id },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
          },
        });

        if (!user) {
          throw new Error("User not found");
        }

        return user;
      } catch {
        throw new Error("Failed to get user");
      }
    }),

  bulkUpsert: protectedProcedure
    .input(
      z.array(
        z.object({
          name: z.string(),
          username: z.string(),
          email: z.string(),
          password: z.string().optional(),
          role: z.string(),
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session.user.organization) {
          throw new Error("Organization not found");
        }

        const results = await Promise.all(
          input.map(async (userData) => {
            const existingUser = await ctx.db.user.findFirst({
              where: {
                email: userData.email,
                organizationId: ctx.session.user.organization?.id,
              },
            });

            const hashedPassword =
              "password" in userData && userData.password
                ? await bcrypt.hash(userData.password, 10)
                : null;

            if (existingUser) {
              return ctx.db.$transaction(async (tx) => {
                const updatedUser = await tx.user.update({
                  where: { id: existingUser.id },
                  data: {
                    name: userData.name,
                    username: userData.username,
                    role: userData.role as Role,
                  },
                });
                if (hashedPassword) {
                  await tx.account.updateMany({
                    where: {
                      userId: existingUser.id,
                      providerId: "credential",
                    },
                    data: { password: hashedPassword },
                  });
                }
                return updatedUser;
              });
            }

            return ctx.db.$transaction(async (tx) => {
              const createdUser = await tx.user.create({
                data: {
                  name: userData.name,
                  username: userData.username,
                  email: userData.email,
                  organization: {
                    connect: { id: ctx.session.user.organization?.id },
                  },
                  role: userData.role as Role,
                  oneTimePassword: generateRandomPassword(8),
                },
              });

              if (hashedPassword) {
                await tx.account.create({
                  data: {
                    accountId: createdUser.id,
                    userId: createdUser.id,
                    providerId: "credential",
                    password: hashedPassword,
                  },
                });
              }
              return createdUser;
            });
          }),
        );

        return results;
      } catch {
        throw new Error("Failed to bulk upsert users");
      }
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        email: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        throw new Error("User not found");
      }

      await ctx.db.account.updateMany({
        where: { userId: user.id, providerId: "credential" },
        data: {
          password: null,
        },
      });

      return user;
    }),

  updatePassword: protectedProcedure
    .input(
      z.object({
        email: z.string(),
        oldPassword: z.string().optional(),
        newPassword: z
          .string()
          .min(1, "Password is required")
          .min(8, "Password must have than 8 characters"),
        confirmPassword: z
          .string()
          .min(1, "Password is required")
          .min(8, "Password must have than 8 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.newPassword !== input.confirmPassword) {
        return {
          error: {
            message: "Passwords don't match",
          },
        };
      }

      const userExists = await ctx.db.user.findUnique({
        where: {
          email: input.email,
        },
      });

      if (!userExists) {
        return {
          error: {
            message: "User does not exist",
          },
        };
      }

      const account = await ctx.db.account.findFirst({
        where: {
          userId: userExists.id,
          providerId: "credential",
        },
      });

      if (account?.password) {
        if (!input.oldPassword) {
          return {
            error: {
              message: "Please provide old password",
            },
          };
        }

        const isPasswordValid = await bcrypt.compare(
          input.oldPassword,
          account.password,
        );
        if (!isPasswordValid) {
          return {
            error: {
              message: "Old password is incorrect",
            },
          };
        }
      }

      const password = await bcrypt.hash(input.newPassword, 10);

      const existingAccount = await ctx.db.account.findFirst({
        where: { userId: userExists.id, providerId: "credential" },
      });

      if (existingAccount) {
        await ctx.db.account.update({
          where: { id: existingAccount.id },
          data: { password: password },
        });
      } else {
        await ctx.db.account.create({
          data: {
            accountId: userExists.id,
            userId: userExists.id,
            providerId: "credential",
            password: password,
          },
        });
      }

      return {
        success: true,
        message: "User updated successfully",
      };
    }),

  instructor_resetPassword: protectedProcedure
    .input(
      z.object({
        email: z.string(),
        newPassword: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (currentUser.role !== "INSTRUCTOR") {
        return {
          error: {
            message: "Unauthorized",
          },
        };
      }

      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        return {
          error: {
            message: "User not found",
          },
        };
      }

      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      const existingAccountForInstructorReset = await ctx.db.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      });

      if (existingAccountForInstructorReset) {
        await ctx.db.account.update({
          where: { id: existingAccountForInstructorReset.id },
          data: { password: hashedPassword },
        });
      } else {
        await ctx.db.account.create({
          data: {
            accountId: user.id,
            userId: user.id,
            providerId: "credential",
            password: hashedPassword,
          },
        });
      }

      return {
        success: true,
        message: "Password reset successfully",
      };
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        oldPassword: z.string().optional(),
        password: z.string().min(8),
        confirmPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      try {
        if (input.password !== input.confirmPassword) {
          throw new Error("Passwords do not match");
        }

        const account = await ctx.db.account.findFirst({
          where: { userId: user.id, providerId: "credential" },
        });

        if (input.oldPassword) {
          if (!account?.password) {
            throw new Error("User does not have a password");
          }
          const isOldPasswordCorrect = await bcrypt.compare(
            input.oldPassword,
            account.password,
          );

          if (!isOldPasswordCorrect) {
            throw new Error("Old password is incorrect");
          }
        }

        const hashedPassword = await bcrypt.hash(input.password, 10);

        const existingAccountForChange = await ctx.db.account.findFirst({
          where: { userId: user.id, providerId: "credential" },
        });

        if (existingAccountForChange) {
          if (input.oldPassword) {
            if (!existingAccountForChange.password) {
              throw new Error("User does not have a password");
            }
            const isOldPasswordCorrect = await bcrypt.compare(
              input.oldPassword,
              existingAccountForChange.password,
            );

            if (!isOldPasswordCorrect) {
              throw new Error("Old password is incorrect");
            }
          }
          await ctx.db.account.update({
            where: { id: existingAccountForChange.id },
            data: { password: hashedPassword },
          });
        } else {
          await ctx.db.account.create({
            data: {
              accountId: user.id,
              userId: user.id,
              providerId: "credential",
              password: hashedPassword,
            },
          });
        }

        await ctx.db.session.deleteMany({
          where: {
            userId: user.id,
          },
        });

        return {
          success: true,
          message: "Password changed successfully",
        };
      } catch (error) {
        console.error("Error changing password:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "An error occurred while changing password",
        );
      }
    }),

  getUserProfile: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    const userProfile = await ctx.db.user.findUnique({
      where: {
        id: currentUser.id,
      },
      include: {
        profile: true,
      },
    });

    return userProfile;
  }),

  checkUserPassword: protectedProcedure.query(async ({ ctx }) => {
    try {
      const currentUser = ctx.session.user;

      const userWithPassword = await ctx.db.account.findUnique({
        where: {
          id: currentUser.id,
          providerId: "credential",
        },
        select: {
          password: true,
        },
      });
      const isPasswordExists = userWithPassword?.password !== null;

      return {
        success: true,
        data: {
          isPasswordExists,
          email: currentUser.email,
        },
      };
    } catch (error) {
      console.error("Error checking user password:", error);
      return {
        success: false,
        error: "Failed to check user password",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }),

  getUserSessions: protectedProcedure.query(async ({ ctx }) => {
    try {
      const currentUser = ctx.session.user;

      const sessions = await ctx.db.session.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: "desc" },
      });

      const accounts = await ctx.db.account.findMany({
        where: { userId: currentUser.id },
      });

      return {
        success: true,
        data: {
          sessions,
          accounts,
          currentSessionId: ctx.session.session.id,
        },
      };
    } catch (error) {
      console.error("Error fetching user sessions:", error);
      return {
        success: false,
        error: "Failed to fetch user sessions",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }),

  deleteSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;

        const session = await ctx.db.session.findFirst({
          where: {
            id: input.sessionId,
            userId: currentUser.id,
          },
        });

        if (!session) {
          throw new Error("Session not found or unauthorized");
        }

        await ctx.db.session.delete({
          where: { id: input.sessionId },
        });

        return { success: true };
      } catch (error) {
        console.error("Error deleting session:", error);
        throw new Error(
          error instanceof Error ? error.message : "Failed to delete session",
        );
      }
    }),

  getTutorActivityData: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        filter: z.array(z.string()).optional(),
        page: z.number().default(1),
        limit: z.number().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;
        const { search, filter, page, limit } = input;

        if (
          currentUser.role !== "INSTRUCTOR" &&
          currentUser.role !== "MENTOR"
        ) {
          return { success: false, error: "Unauthorized access" };
        }

        const searchTerm = search ?? "";
        const filters = filter ?? [];
        const onlineCutoff = new Date(Date.now() - 2 * 60 * 1000);

        const activeFilters = filters
          .map((f) => {
            const [column, operator, value] = f.split(":");
            return { column, operator, value };
          })
          .filter((f) => f.column && f.operator && f.value);

        const enrolledCourses = await ctx.db.enrolledUsers.findMany({
          where: {
            username: currentUser.username,
            courseId: {
              not: null,
            },
          },
          select: {
            courseId: true,
          },
        });

        const courseIds = enrolledCourses
          .map((enrolled) => enrolled.courseId)
          .filter(Boolean);
        const uniqueCourseIds = [...new Set(courseIds)];

        const where: Record<string, any> = {
          courseId: {
            in: uniqueCourseIds,
          },
          user: {
            role: {
              in: ["STUDENT", "MENTOR"],
            },
            organizationId: currentUser.organizationId,
          },
        };

        if (currentUser.role === "MENTOR") {
          where.mentorUsername = currentUser.username;
        }

        if (searchTerm) {
          where.user.OR = [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { username: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
          ];
        }

        activeFilters.forEach((filter) => {
          const { column, operator, value } = filter;

          if (typeof column === "string") {
            switch (operator) {
              case "contains":
                where.user[column] = { contains: value, mode: "insensitive" };
                break;
              case "equals":
                where.user[column] = value;
                break;
              case "online":
                where.user.lastSeen = { gte: onlineCutoff };
                break;
            }
          }
        });

        const [totalItems, activeCount] = await Promise.all([
          ctx.db.enrolledUsers.count({ where }),
          ctx.db.enrolledUsers.count({
            where: {
              ...where,
              user: {
                ...where.user,
                lastSeen: { gte: onlineCutoff },
              },
            },
          }),
        ]);

        const enrolledUsers = await ctx.db.enrolledUsers.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                mobile: true,
                image: true,
                role: true,
                lastSeen: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
          orderBy: [
            {
              user: {
                lastSeen: {
                  sort: "desc",
                  nulls: "last",
                },
              },
            },
          ],
          skip: (page - 1) * limit,
          take: limit,
          distinct: ["username"],
        });

        const users = enrolledUsers.map((enrolled) => ({
          ...enrolled.user,
          courseId: enrolled.courseId,
          mentorUsername: enrolled.mentorUsername,
        }));

        return {
          success: true,
          data: {
            users,
            totalItems,
            activeCount,
          },
        };
      } catch (error) {
        console.error("Error fetching tutor activity data:", error);
        return {
          success: false,
          error: "Failed to fetch tutor activity data",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    }),

  getTutorManageUsersData: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        sort: z.string().default("name"),
        direction: z.string().default("asc"),
        filter: z.array(z.string()).optional(),
        page: z.number().default(1),
        limit: z.number().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;
        const { search, sort, direction, filter, page, limit } = input;

        if (
          currentUser.role !== "INSTRUCTOR" &&
          currentUser.role !== "MENTOR"
        ) {
          return { success: false, error: "Unauthorized access" };
        }

        const searchTerm = search ?? "";
        const sortField = sort || "name";
        const sortDirection = direction || "asc";
        const filters = filter ?? [];
        const activeFilters = filters
          .map((f) => {
            const [column, operator, value] = f.split(":");
            return { column, operator, value };
          })
          .filter((f) => f.column && f.operator && f.value);

        const courses = await ctx.db.course.findMany({
          where:
            currentUser.role === "INSTRUCTOR"
              ? {
                  enrolledUsers: {
                    some: {
                      username: currentUser.username,
                    },
                  },
                }
              : {
                  enrolledUsers: {
                    some: {
                      mentorUsername: currentUser.username,
                    },
                  },
                },
          select: {
            id: true,
          },
        });

        const courseIds = courses.map((course) => course.id);

        const where: Record<string, any> = {
          courseId: {
            in: courseIds,
          },
          user: {
            role: {
              in: ["STUDENT", "MENTOR"],
            },
            organizationId: currentUser.organizationId,
          },
        };

        if (currentUser.role === "MENTOR") {
          where.mentorUsername = currentUser.username;
        }

        if (searchTerm) {
          where.user.OR = [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { username: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
          ];
        }

        activeFilters.forEach((filter) => {
          const { column, operator, value } = filter;

          if (typeof column === "string") {
            switch (operator) {
              case "contains":
                where.user[column] = { contains: value, mode: "insensitive" };
                break;
              case "equals":
                where.user[column] = value;
                break;
              case "startsWith":
                where.user[column] = { startsWith: value, mode: "insensitive" };
                break;
              case "endsWith":
                where.user[column] = { endsWith: value, mode: "insensitive" };
                break;
              case "greaterThan":
                where.user[column] = { gt: Number(value) };
                break;
              case "lessThan":
                where.user[column] = { lt: Number(value) };
                break;
            }
          }
        });

        const totalItems = await ctx.db.enrolledUsers.count({ where });

        const enrolledUsers = await ctx.db.enrolledUsers.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                role: true,
                oneTimePassword: true,
                disabledAt: true,
              },
            },
          },
          orderBy: {
            user: {
              [sortField]: sortDirection,
            },
          },
          skip: (page - 1) * limit,
          take: limit,
          distinct: ["username"],
        });

        const allUsers = enrolledUsers.map((enrolled) => ({
          ...enrolled.user,
          courseId: enrolled.courseId,
          mentorUsername: enrolled.mentorUsername,
        }));

        return {
          success: true,
          data: {
            users: allUsers,
            totalItems,
            userRole: currentUser.role,
            isAdmin: currentUser.isAdmin,
          },
        };
      } catch (error) {
        console.error("Error fetching tutor manage users data:", error);
        return {
          success: false,
          error: "Failed to fetch tutor manage users data",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    }),

  disableUser: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input: { id } }) => {
      const currentUser = ctx.session.user;
      if (!currentUser || currentUser.role !== "INSTRUCTOR") {
        throw new Error(
          "Unauthorized - Only instructors can manage user status",
        );
      }

      try {
        const user = await ctx.db.user.findUnique({
          where: { id },
          select: { disabledAt: true },
        });

        if (!user) {
          throw new Error("User not found");
        }

        const isCurrentlyDisabled = !!user.disabledAt;

        if (isCurrentlyDisabled) {
          const updatedUser = await ctx.db.user.update({
            where: { id },
            data: { disabledAt: null },
          });
          return {
            success: true,
            message: "User enabled successfully",
            user: updatedUser,
            action: "enabled",
          };
        } else {
          await ctx.db.session.deleteMany({
            where: { userId: id },
          });

          const updatedUser = await ctx.db.user.update({
            where: { id },
            data: { disabledAt: new Date() },
          });

          return {
            success: true,
            message: "User disabled successfully",
            user: updatedUser,
            action: "disabled",
          };
        }
      } catch (error) {
        throw new Error("Failed to update user status");
      }
    }),
});
