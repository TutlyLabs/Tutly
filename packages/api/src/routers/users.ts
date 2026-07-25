import type { Role } from "@tutly/db/browser";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { z } from "zod";

import type { TRPCContext } from "../trpc";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const STAFF_ROLES: Role[] = ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"];

/**
 * Middleware that ensures the user is staff (INSTRUCTOR / ADMIN / SUPER_ADMIN)
 */
const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!STAFF_ROLES.includes(ctx.session.user.role as Role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Staff access required",
    });
  }
  return next({ ctx });
});

// Roles staff may assign; ADMIN / SUPER_ADMIN must never be grantable here.
const assignableRoleSchema = z.enum(["STUDENT", "MENTOR", "INSTRUCTOR"]);

/**
 * Resolves a target user that must live in the caller's organization.
 * Uses NOT_FOUND for both "missing" and "other tenant" so tenancy is not probeable.
 */
const findUserInCallerOrg = async (
  ctx: TRPCContext & { session: { user: any } },
  where: { id: string } | { email: string },
) => {
  const organizationId = ctx.session.user.organizationId as string | null;
  if (!organizationId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Organization not found" });
  }

  const user = await ctx.db.user.findFirst({
    where: { ...where, organizationId },
    select: { id: true, disabledAt: true },
  });

  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  return user;
};

export const generateRandomPassword = (length = 8) => {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  let password = "";
  password += lowercase[randomInt(lowercase.length)];
  password += uppercase[randomInt(uppercase.length)];
  password += numbers[randomInt(numbers.length)];
  password += symbols[randomInt(symbols.length)];

  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = password.length; i < length; i++) {
    password += allChars[randomInt(allChars.length)];
  }

  const arr = password.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.join("");
};

// Safe user schema - only expose non-sensitive fields
const safeUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  role: z.string(),
  image: z.string().nullable(),
  mobile: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  isEmailVerified: z.boolean(),
  isProfilePublic: z.boolean(),
});

export const usersRouter = createTRPCRouter({
  hasCredentialAccount: protectedProcedure.query(async ({ ctx }) => {
    const account = await ctx.db.account.findFirst({
      where: { userId: ctx.session.user.id, providerId: "credential" },
      select: { id: true },
    });
    return Boolean(account);
  }),

  getProfileRedirect: protectedProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const enrolled = await ctx.db.enrolledUsers.findFirst({
        where: { username: input.username.toUpperCase() },
        include: {
          course: { select: { id: true } },
          user: { select: { role: true } },
        },
        orderBy: { startDate: "desc" },
      });
      return {
        courseId: enrolled?.course?.id ?? null,
        isMentor: enrolled?.user?.role === "MENTOR",
        username: input.username,
      };
    }),

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
            socialLinks: z.record(z.string(), z.string()),
            professionalProfiles: z.record(z.string(), z.string()),
            academicDetails: z.record(z.string(), z.string()),
            experiences: z.array(z.record(z.string(), z.any())),
            address: z.record(z.string(), z.string()),
            documents: z.record(z.string(), z.string()),
            metadata: z.record(z.string(), z.any()),
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

  createUser: staffProcedure
    .input(
      z.object({
        name: z.string(),
        username: z.string(),
        email: z.string(),
        password: z.string(),
        role: assignableRoleSchema,
      }),
    )
    .output(safeUserSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session.user.organization) {
          throw new Error("Organization not found");
        }

        // Check if username already exists
        const existingUser = await ctx.db.user.findUnique({
          where: { username: input.username },
        });

        if (existingUser) {
          throw new Error(
            `Username "${input.username}" already exists. Please choose a different username.`
          );
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
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create user";
        console.error("[createUser] Error:", errorMessage, error);
        throw new Error(errorMessage);
      }
    }),

  updateUser: staffProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        username: z.string(),
        email: z.string(),
        role: assignableRoleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await findUserInCallerOrg(ctx, { id: input.id });

      try {
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

  deleteUser: staffProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await findUserInCallerOrg(ctx, { id: input.id });

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

  bulkUpsert: staffProcedure
    .input(
      z.array(
        z.object({
          name: z.string(),
          username: z.string(),
          email: z.string(),
          password: z.string().optional(),
          role: assignableRoleSchema,
        }),
      ),
    )
    .output(z.array(safeUserSchema))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session.user.organization) {
          throw new Error("Organization not found");
        }

        const results = await Promise.all(
          input.map(async (userData) => {
            try {
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

              // For new users, check if username already exists
              const usernameExists = await ctx.db.user.findUnique({
                where: { username: userData.username },
              });

              if (usernameExists) {
                throw new Error(
                  `Username "${userData.username}" already exists. Cannot create duplicate username.`
                );
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
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
              console.error(
                `[bulkUpsert] Error processing user ${userData.username}:`,
                errorMessage,
                error
              );
              throw error;
            }
          }),
        );

        return results;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to bulk upsert users";
        console.error("[bulkUpsert] Error:", errorMessage, error);
        throw new Error(errorMessage);
      }
    }),

  // Password resets go through better-auth (`authClient.requestPasswordReset`
  // / `authClient.resetPassword`); this procedure only rotates a known password.
  updatePassword: protectedProcedure
    .input(
      z.object({
        oldPassword: z.string().min(1, "Old password is required"),
        newPassword: z
          .string()
          .min(8, "Password must have than 8 characters"),
        confirmPassword: z
          .string()
          .min(8, "Password must have than 8 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.newPassword !== input.confirmPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Passwords don't match",
        });
      }

      const account = await ctx.db.account.findFirst({
        where: {
          userId: ctx.session.user.id,
          providerId: "credential",
        },
      });

      if (!account?.password) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No password is set for this account. Use the password reset flow.",
        });
      }

      const isPasswordValid = await bcrypt.compare(
        input.oldPassword,
        account.password,
      );
      if (!isPasswordValid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Old password is incorrect",
        });
      }

      await ctx.db.account.update({
        where: { id: account.id },
        data: { password: await bcrypt.hash(input.newPassword, 10) },
      });

      return {
        success: true,
        message: "User updated successfully",
      };
    }),

  instructor_resetPassword: staffProcedure
    .input(
      z.object({
        email: z.string(),
        newPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await findUserInCallerOrg(ctx, { email: input.email });

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
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Passwords do not match",
          });
        }

        const account = await ctx.db.account.findFirst({
          where: { userId: user.id, providerId: "credential" },
        });

        // Whether the old password is required is decided from stored state, never
        // from the client: omitting it must not skip verification.
        if (account?.password) {
          if (!input.oldPassword) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Current password is required",
            });
          }
          const isOldPasswordCorrect = await bcrypt.compare(
            input.oldPassword,
            account.password,
          );
          if (!isOldPasswordCorrect) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Current password is incorrect",
            });
          }
        }

        const hashedPassword = await bcrypt.hash(input.password, 10);

        if (account) {
          await ctx.db.account.update({
            where: { id: account.id },
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
        if (error instanceof TRPCError) throw error;
        console.error("Error changing password:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while changing password",
        });
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

      const credentialAccount = await ctx.db.account.findFirst({
        where: {
          userId: currentUser.id,
          providerId: "credential",
        },
        select: {
          password: true,
        },
      });
      const isPasswordExists =
        credentialAccount !== null && credentialAccount.password !== null;

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
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
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

        const parseHours = (raw: string | undefined) => {
          const n = Number(raw);
          return Number.isFinite(n) && n > 0 ? n : null;
        };

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
              case "seen_within_hours": {
                const hours = parseHours(value);
                if (hours)
                  where.user.lastSeen = {
                    gte: new Date(Date.now() - hours * 60 * 60 * 1000),
                  };
                break;
              }
              case "seen_before_hours": {
                const hours = parseHours(value);
                if (hours)
                  where.user.lastSeen = {
                    lt: new Date(Date.now() - hours * 60 * 60 * 1000),
                  };
                break;
              }
              case "never_seen":
                where.user.lastSeen = null;
                break;
            }
          }
        });

        const now = Date.now();
        const h = (n: number) => new Date(now - n * 60 * 60 * 1000);
        const [
          totalItems,
          activeCount,
          neverSeenCount,
          last1hCount,
          last24hCount,
          last7dCount,
        ] = await Promise.all([
          ctx.db.enrolledUsers.count({ where }),
          ctx.db.enrolledUsers.count({
            where: {
              ...where,
              user: { ...where.user, lastSeen: { gte: onlineCutoff } },
            },
          }),
          ctx.db.enrolledUsers.count({
            where: { ...where, user: { ...where.user, lastSeen: null } },
          }),
          ctx.db.enrolledUsers.count({
            where: {
              ...where,
              user: { ...where.user, lastSeen: { gte: h(1) } },
            },
          }),
          ctx.db.enrolledUsers.count({
            where: {
              ...where,
              user: { ...where.user, lastSeen: { gte: h(24) } },
            },
          }),
          ctx.db.enrolledUsers.count({
            where: {
              ...where,
              user: { ...where.user, lastSeen: { gte: h(24 * 7) } },
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
            neverSeenCount,
            last1hCount,
            last24hCount,
            last7dCount,
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
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
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

        let allUsers;
        let totalItems;

        if (currentUser.role === "INSTRUCTOR") {
          // For instructors: show all users in organization (enrolled or not)
          const userWhere: Record<string, any> = {
            role: {
              in: ["STUDENT", "MENTOR"],
            },
            organizationId: currentUser.organizationId,
          };

          if (searchTerm) {
            userWhere.OR = [
              { name: { contains: searchTerm, mode: "insensitive" } },
              { username: { contains: searchTerm, mode: "insensitive" } },
              { email: { contains: searchTerm, mode: "insensitive" } },
            ];
          }

          // Apply custom filters
          activeFilters.forEach((filter) => {
            const { column, operator, value } = filter;

            if (typeof column === "string") {
              switch (operator) {
                case "contains":
                  userWhere[column] = {
                    contains: value,
                    mode: "insensitive",
                  };
                  break;
                case "equals":
                  userWhere[column] = value;
                  break;
                case "startsWith":
                  userWhere[column] = { startsWith: value, mode: "insensitive" };
                  break;
                case "endsWith":
                  userWhere[column] = { endsWith: value, mode: "insensitive" };
                  break;
                case "greaterThan":
                  userWhere[column] = { gt: Number(value) };
                  break;
                case "lessThan":
                  userWhere[column] = { lt: Number(value) };
                  break;
              }
            }
          });

          totalItems = await ctx.db.user.count({ where: userWhere });

          const allOrgUsers = await ctx.db.user.findMany({
            where: userWhere,
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              role: true,
              disabledAt: true,
            },
            orderBy: {
              [sortField]: sortDirection,
            },
            skip: (page - 1) * limit,
            take: limit,
          });

          // Get enrollment info for these users (to show which course/mentor they're assigned to)
          const enrollmentMap = await ctx.db.enrolledUsers.findMany({
            where: {
              username: {
                in: allOrgUsers.map((u) => u.username),
              },
              courseId: {
                in: courseIds,
              },
            },
            select: {
              username: true,
              courseId: true,
              mentorUsername: true,
            },
          });

          const enrollmentsByUsername = new Map(
            enrollmentMap.map((e) => [e.username, e])
          );

          allUsers = allOrgUsers.map((user) => {
            const enrollment = enrollmentsByUsername.get(user.username);
            return {
              ...user,
              courseId: enrollment?.courseId ?? null,
              mentorUsername: enrollment?.mentorUsername ?? null,
            };
          });
        } else {
          // For mentors: show only their assigned mentees
          const mentorWhere: Record<string, any> = {
            mentorUsername: currentUser.username,
          };

          if (searchTerm) {
            mentorWhere.user = {
              OR: [
                { name: { contains: searchTerm, mode: "insensitive" } },
                { username: { contains: searchTerm, mode: "insensitive" } },
                { email: { contains: searchTerm, mode: "insensitive" } },
              ],
            };
          }

          activeFilters.forEach((filter) => {
            const { column, operator, value } = filter;

            if (typeof column === "string") {
              if (!mentorWhere.user) mentorWhere.user = {};
              switch (operator) {
                case "contains":
                  mentorWhere.user[column] = {
                    contains: value,
                    mode: "insensitive",
                  };
                  break;
                case "equals":
                  mentorWhere.user[column] = value;
                  break;
                case "startsWith":
                  mentorWhere.user[column] = { startsWith: value, mode: "insensitive" };
                  break;
                case "endsWith":
                  mentorWhere.user[column] = { endsWith: value, mode: "insensitive" };
                  break;
                case "greaterThan":
                  mentorWhere.user[column] = { gt: Number(value) };
                  break;
                case "lessThan":
                  mentorWhere.user[column] = { lt: Number(value) };
                  break;
              }
            }
          });

          totalItems = await ctx.db.enrolledUsers.count({ where: mentorWhere });

          const mentorEnrolledUsers = await ctx.db.enrolledUsers.findMany({
            where: mentorWhere,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  email: true,
                  role: true,
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

          allUsers = mentorEnrolledUsers.map((enrolled) => ({
            ...enrolled.user,
            courseId: enrolled.courseId,
            mentorUsername: enrolled.mentorUsername,
          }));
        }

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

  // Public profile — accessible without auth if profile is public
  getPublicProfile: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { username: input.username },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          role: true,
          isProfilePublic: true,
          createdAt: true,
          organizationId: true,
          profile: {
            select: {
              headline: true,
              skills: true,
              aboutMe: true,
              hobbies: true,
              socialLinks: true,
              professionalProfiles: true,
              academicDetails: true,
              experiences: true,
              dateOfBirth: true,
              gender: true,
              address: true,
              metadata: true,
            },
          },
          enrolledUsers: {
            select: {
              course: { select: { id: true, title: true, image: true } },
              startDate: true,
            },
            take: 10,
          },
        },
      });

      if (!user) return null;
      if (!user.isProfilePublic) return { id: user.id, isPrivate: true };

      // For instructors/mentors also fetch courses they teach/mentor + stats
      let taughtCourses: Array<{ id: string; title: string; image: string | null }> = [];
      let instructorStats: { totalStudents: number; totalCourses: number; totalAssignments: number } | null = null;
      if (user.role === "INSTRUCTOR" || user.role === "MENTOR") {
        const courses = await ctx.db.course.findMany({
          where: { createdById: user.id },
          select: { id: true, title: true, image: true },
        });
        taughtCourses = courses.slice(0, 10);
        const courseIds = courses.map((c) => c.id);
        const [studentCount, assignmentCount] = await Promise.all([
          courseIds.length > 0
            ? ctx.db.enrolledUsers.count({ where: { courseId: { in: courseIds } } })
            : Promise.resolve(0),
          courseIds.length > 0
            ? ctx.db.attachment.count({ where: { courseId: { in: courseIds } } })
            : Promise.resolve(0),
        ]);
        instructorStats = {
          totalStudents: studentCount,
          totalCourses: courses.length,
          totalAssignments: assignmentCount,
        };
      }

      // Compute stats for students
      let stats: { totalPoints: number; totalSubmissions: number; assignmentsEvaluated: number; attendancePercentage: number | null } | null = null;
      const activityCounts: Record<string, number> = {};
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 364);
      oneYearAgo.setHours(0, 0, 0, 0);

      if (user.role === "STUDENT") {
        const [submissions, attendance] = await Promise.all([
          ctx.db.submission.findMany({
            where: { enrolledUser: { username: user.username } },
            include: { points: { select: { score: true } } },
          }),
          ctx.db.attendance.findMany({
            where: { username: user.username },
            select: { attended: true },
          }),
        ]);
        const totalPoints = submissions.reduce(
          (acc, s) => acc + s.points.reduce((a, p) => a + (p.score ?? 0), 0),
          0,
        );
        const evaluatedCount = submissions.filter((s) => s.points.length > 0).length;
        const attendancePercentage = attendance.length > 0
          ? Math.round((attendance.filter((a) => a.attended).length / attendance.length) * 100)
          : null;
        stats = { totalPoints, totalSubmissions: submissions.length, assignmentsEvaluated: evaluatedCount, attendancePercentage };

        for (const s of submissions) {
          const d = s.submissionDate ?? s.createdAt;
          if (d && d >= oneYearAgo) {
            const key = d.toISOString().slice(0, 10);
            activityCounts[key] = (activityCounts[key] ?? 0) + 1;
          }
        }
      } else if (user.role === "INSTRUCTOR" || user.role === "MENTOR") {
        const points = await ctx.db.point.findMany({
          where: {
            createdAt: { gte: oneYearAgo },
            submissions: {
              enrolledUser: {
                course: { createdById: user.id },
              },
            },
          },
          select: { createdAt: true },
        });
        for (const p of points) {
          const key = p.createdAt.toISOString().slice(0, 10);
          activityCounts[key] = (activityCounts[key] ?? 0) + 1;
        }
      }

      const activityHeatmap = Object.entries(activityCounts).map(
        ([date, count]) => ({ date, count }),
      );

      return {
        ...user,
        taughtCourses,
        stats,
        instructorStats,
        activityHeatmap,
      };
    }),

  // Toggle profile visibility
  setProfilePublic: protectedProcedure
    .input(z.object({ isPublic: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { isProfilePublic: input.isPublic },
        select: { isProfilePublic: true },
      });
    }),

  // Update headline + skills (profile extended fields)
  updateProfileExtended: protectedProcedure
    .input(
      z.object({
        headline: z.string().max(120).optional(),
        skills: z.array(z.string()).max(30).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.profile.upsert({
        where: { userId },
        create: { userId, ...input },
        update: input,
      });
    }),

  disableUser: staffProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input: { id } }) => {
      const user = await findUserInCallerOrg(ctx, { id });

      try {
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
