import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const MESSAGE_PAGE_SIZE = 40;

export const chatRouter = createTRPCRouter({
  // List groups the current user belongs to
  getMyGroups: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const memberships = await ctx.db.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            course: { select: { id: true, title: true, image: true } },
            members: {
              select: {
                userId: true,
                user: { select: { id: true, name: true, username: true, image: true } },
              },
            },
            messages: {
              where: { deletedAt: null },
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                sender: { select: { id: true, name: true, username: true, image: true } },
              },
            },
          },
        },
      },
      orderBy: { group: { updatedAt: "desc" } },
    });

    const unreadCounts = await Promise.all(
      memberships.map((m) =>
        ctx.db.message.count({
          where: {
            groupId: m.groupId,
            deletedAt: null,
            senderId: { not: userId },
            ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
          },
        }),
      ),
    );

    return memberships.map((m, i) => ({
      ...m.group,
      memberRole: m.role,
      lastReadAt: m.lastReadAt,
      unreadCount: unreadCounts[i] ?? 0,
    }));
  }),

  // Get messages for a group (cursor pagination)
  getMessages: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const member = await ctx.db.groupMember.findUnique({
        where: { groupId_userId: { groupId: input.groupId, userId } },
      });
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      const messages = await ctx.db.message.findMany({
        where: { groupId: input.groupId },
        orderBy: { createdAt: "desc" },
        take: MESSAGE_PAGE_SIZE + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          sender: { select: { id: true, name: true, username: true, image: true } },
          reactions: {
            include: { user: { select: { id: true, name: true } } },
          },
          replyTo: {
            include: {
              sender: { select: { id: true, name: true, username: true, image: true } },
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (messages.length > MESSAGE_PAGE_SIZE) {
        nextCursor = messages.pop()!.id;
      }

      return { messages: messages.reverse(), nextCursor };
    }),

  // Poll for new messages since a timestamp
  getNewMessages: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        since: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const member = await ctx.db.groupMember.findUnique({
        where: { groupId_userId: { groupId: input.groupId, userId } },
      });
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.db.message.findMany({
        where: {
          groupId: input.groupId,
          createdAt: { gt: input.since },
        },
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, name: true, username: true, image: true } },
          reactions: { include: { user: { select: { id: true, name: true } } } },
          replyTo: {
            include: {
              sender: { select: { id: true, name: true, username: true, image: true } },
            },
          },
        },
      });
    }),

  // Send a message
  sendMessage: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        content: z.string().min(1).max(4000),
        replyToId: z.string().optional(),
        type: z.enum(["TEXT", "IMAGE", "FILE"]).default("TEXT"),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const member = await ctx.db.groupMember.findUnique({
        where: { groupId_userId: { groupId: input.groupId, userId } },
        include: {
          group: { select: { type: true, postingPolicy: true } },
        },
      });
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      // Honor the group's posting policy: ADMINS_ONLY locks out non-admins.
      if (
        (member.group as any).postingPolicy === "ADMINS_ONLY" &&
        member.role !== "ADMIN"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to post in this group.",
        });
      }

      const message = await ctx.db.message.create({
        data: {
          groupId: input.groupId,
          senderId: userId,
          content: input.content,
          type: input.type as any,
          replyToId: input.replyToId,
          metadata: input.metadata as any,
        },
        include: {
          sender: { select: { id: true, name: true, username: true, image: true } },
          reactions: { include: { user: { select: { id: true, name: true } } } },
          replyTo: {
            include: {
              sender: { select: { id: true, name: true, username: true, image: true } },
            },
          },
        },
      });

      // bump group updatedAt
      await ctx.db.chatGroup.update({
        where: { id: input.groupId },
        data: { updatedAt: new Date() },
      });

      // Fire notifications (fire-and-forget)
      void (async () => {
        try {
          const group = await ctx.db.chatGroup.findUnique({
            where: { id: input.groupId },
            include: { members: { select: { userId: true } } },
          });
          if (!group) return;
          const sender = await ctx.db.user.findUnique({
            where: { id: userId },
            select: { name: true },
          });
          const senderName = sender?.name ?? "Someone";

          if (group.type === "DIRECT") {
            // Notify the other person in a DM
            const otherId = group.members.find((m) => m.userId !== userId)?.userId;
            if (otherId) {
              await ctx.db.notification.create({
                data: {
                  message: `${senderName}: ${input.type === "IMAGE" ? "📷 Photo" : input.type === "FILE" ? "📎 File" : input.content.slice(0, 100)}`,
                  eventType: "DIRECT_MESSAGE" as any,
                  causedById: userId,
                  intendedForId: otherId,
                  mediumSent: "NOTIFICATION" as any,
                  customLink: `/community?g=${input.groupId}`,
                },
              });
            }
          } else if (input.type === "TEXT") {
            // Detect @mentions and notify mentioned users
            const mentions = [...input.content.matchAll(/@(\w+)/g)].map((m) => m[1]!);
            if (mentions.length > 0) {
              const mentionedUsers = await ctx.db.user.findMany({
                where: { username: { in: mentions }, id: { not: userId } },
                select: { id: true },
              });
              for (const mentionedUser of mentionedUsers) {
                // Only notify if they're a member of the group
                const isMember = group.members.some((m) => m.userId === mentionedUser.id);
                if (!isMember) continue;
                await ctx.db.notification.create({
                  data: {
                    message: `${senderName} mentioned you: ${input.content.slice(0, 100)}`,
                    eventType: "CHAT_MENTION" as any,
                    causedById: userId,
                    intendedForId: mentionedUser.id,
                    mediumSent: "NOTIFICATION" as any,
                    customLink: `/community?g=${input.groupId}`,
                  },
                });
              }
            }
          }
        } catch (e) {
          // Notification errors should never fail the message send
        }
      })();

      return message;
    }),

  // Delete own message (soft)
  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const msg = await ctx.db.message.findUnique({ where: { id: input.messageId } });
      if (!msg) throw new TRPCError({ code: "NOT_FOUND" });

      const member = await ctx.db.groupMember.findUnique({
        where: { groupId_userId: { groupId: msg.groupId, userId } },
      });
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });
      if (msg.senderId !== userId && member.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.db.message.update({
        where: { id: input.messageId },
        data: { deletedAt: new Date() },
      });
    }),

  // Toggle pin on a message (admin/instructor or own message in CUSTOM groups)
  togglePin: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const message = await ctx.db.message.findUnique({
        where: { id: input.messageId },
        include: { group: true },
      });
      if (!message) throw new TRPCError({ code: "NOT_FOUND" });

      const member = await ctx.db.groupMember.findUnique({
        where: { groupId_userId: { groupId: message.groupId, userId } },
      });
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });
      if (member.role !== "ADMIN" && message.senderId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const updated = await ctx.db.message.update({
        where: { id: input.messageId },
        data: { isPinned: !message.isPinned },
      });
      return { isPinned: updated.isPinned };
    }),

  // Get pinned messages for a group
  getPinnedMessages: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const member = await ctx.db.groupMember.findUnique({
        where: { groupId_userId: { groupId: input.groupId, userId } },
      });
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.db.message.findMany({
        where: { groupId: input.groupId, isPinned: true, deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: { sender: { select: { id: true, name: true, username: true, image: true } } },
      });
    }),

  // Get the chat group for a specific course (returns null if not found or not a member)
  getCourseGroup: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const membership = await ctx.db.groupMember.findFirst({
        where: {
          userId,
          group: { courseId: input.courseId, type: "COURSE" },
        },
        select: { groupId: true },
      });
      return membership ? { groupId: membership.groupId } : null;
    }),

  // Toggle emoji reaction
  toggleReaction: protectedProcedure
    .input(z.object({ messageId: z.string(), emoji: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const existing = await ctx.db.messageReaction.findUnique({
        where: { messageId_userId_emoji: { messageId: input.messageId, userId, emoji: input.emoji } },
      });
      if (existing) {
        await ctx.db.messageReaction.delete({ where: { id: existing.id } });
        return { action: "removed" };
      }
      await ctx.db.messageReaction.create({
        data: { messageId: input.messageId, userId, emoji: input.emoji },
      });
      return { action: "added" };
    }),

  // Mark group as read
  markRead: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.groupMember.update({
        where: { groupId_userId: { groupId: input.groupId, userId } },
        data: { lastReadAt: new Date() },
      });
    }),

  // Get group info + members
  getGroupInfo: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const member = await ctx.db.groupMember.findUnique({
        where: { groupId_userId: { groupId: input.groupId, userId } },
      });
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.db.chatGroup.findUnique({
        where: { id: input.groupId },
        include: {
          course: { select: { id: true, title: true, image: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, username: true, image: true, role: true } },
            },
          },
          createdBy: { select: { id: true, name: true, username: true, image: true } },
        },
      });
    }),

  // Create a custom group
  createGroup: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(300).optional(),
        memberUserIds: z.array(z.string()).min(1).max(100),
        image: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const allMemberIds = Array.from(new Set([userId, ...input.memberUserIds]));

      const group = await ctx.db.chatGroup.create({
        data: {
          name: input.name,
          description: input.description,
          type: "CUSTOM",
          image: input.image,
          createdById: userId,
          organizationId: ctx.session.user.organizationId ?? undefined,
          members: {
            create: allMemberIds.map((uid) => ({
              userId: uid,
              role: uid === userId ? "ADMIN" : "MEMBER",
            })),
          },
        },
      });

      // System activity message
      await ctx.db.message.create({
        data: {
          groupId: group.id,
          senderId: userId,
          content: "Group created",
          type: "ACTIVITY",
          metadata: { event: "GROUP_CREATED" },
        },
      });

      return group;
    }),

  // Add members to a group
  addMembers: protectedProcedure
    .input(z.object({ groupId: z.string(), userIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const member = await ctx.db.groupMember.findUnique({
        where: { groupId_userId: { groupId: input.groupId, userId } },
      });
      if (!member || member.role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.db.groupMember.createMany({
        data: input.userIds.map((uid) => ({ groupId: input.groupId, userId: uid })),
        skipDuplicates: true,
      });

      // Activity message for member addition
      const addedUsers = await ctx.db.user.findMany({
        where: { id: { in: input.userIds } },
        select: { name: true },
      });
      if (addedUsers.length > 0) {
        const names = addedUsers.map((u) => u.name).join(", ");
        await ctx.db.message.create({
          data: {
            groupId: input.groupId,
            senderId: userId,
            content: `➕ ${names} ${addedUsers.length === 1 ? "was" : "were"} added to the group`,
            type: "ACTIVITY",
            metadata: { event: "MEMBERS_ADDED" },
          },
        });
      }

      return { added: input.userIds.length };
    }),

  // Ensure course groups exist for the current user (called on community page load)
  syncCourseGroups: protectedProcedure.mutation(async ({ ctx }) => {
    const user = ctx.session.user;
    const orgId = user.organizationId;

    // Get all courses the user is involved with
    const [enrolledCourses, taughtCourses, mentorCourses] = await Promise.all([
      ctx.db.enrolledUsers.findMany({
        where: { username: user.username },
        include: {
          course: true,
          mentor: { select: { id: true, username: true } },
        },
      }),
      ctx.db.course.findMany({ where: { createdById: user.id } }),
      ctx.db.enrolledUsers.findMany({
        where: { mentorUsername: user.username },
        include: { course: true },
      }),
    ]);

    type CourseInfo = { title: string; image: string | null };
    const courseInfo = new Map<string, CourseInfo>();
    // (courseId → mentorUsername) for courses where the current user is enrolled
    const ownMentorByCourse = new Map<string, string>();
    // (courseId → courseInstructorId) so we can add the instructor to mentor groups
    const courseInstructorById = new Map<string, string>();

    for (const eu of enrolledCourses) {
      if (eu.course) {
        courseInfo.set(eu.course.id, {
          title: eu.course.title,
          image: eu.course.image,
        });
        if (eu.mentor?.username)
          ownMentorByCourse.set(eu.course.id, eu.mentor.username);
      }
    }
    for (const c of taughtCourses) {
      courseInfo.set(c.id, { title: c.title, image: c.image });
      courseInstructorById.set(c.id, user.id);
    }
    for (const eu of mentorCourses) {
      if (eu.course)
        courseInfo.set(eu.course.id, {
          title: eu.course.title,
          image: eu.course.image,
        });
    }

    // Fetch instructor IDs for any course we don't yet know
    const missingInstructorCourseIds = Array.from(courseInfo.keys()).filter(
      (id) => !courseInstructorById.has(id),
    );
    if (missingInstructorCourseIds.length > 0) {
      const courses = await ctx.db.course.findMany({
        where: { id: { in: missingInstructorCourseIds } },
        select: { id: true, createdById: true },
      });
      for (const c of courses) courseInstructorById.set(c.id, c.createdById);
    }

    let synced = 0;

    for (const [courseId, course] of Array.from(courseInfo.entries())) {
      // ── 1. COURSE group: announcement channel for the whole course ─────
      let courseGroup = await ctx.db.chatGroup.findFirst({
        where: { courseId, type: "COURSE" },
      });
      if (!courseGroup) {
        courseGroup = await ctx.db.chatGroup.create({
          data: {
            name: course.title,
            description: "Course announcements from instructors and mentors.",
            type: "COURSE",
            image: course.image,
            courseId,
            postingPolicy: "ADMINS_ONLY",
            organizationId: orgId ?? undefined,
            createdById: user.id,
          },
        });
        await ctx.db.message.create({
          data: {
            groupId: courseGroup.id,
            senderId: user.id,
            content: `Welcome to ${course.title}!`,
            type: "ACTIVITY",
            metadata: { event: "GROUP_CREATED" },
          },
        });
      }

      const isInstructorOfThisCourse =
        courseInstructorById.get(courseId) === user.id;
      const isMentorOfThisCourse = mentorCourses.some(
        (m) => m.courseId === courseId,
      );
      const courseRole =
        isInstructorOfThisCourse || isMentorOfThisCourse ? "ADMIN" : "MEMBER";

      await ctx.db.groupMember.upsert({
        where: {
          groupId_userId: { groupId: courseGroup.id, userId: user.id },
        },
        create: {
          groupId: courseGroup.id,
          userId: user.id,
          role: courseRole,
        },
        update: { role: courseRole },
      });

      // ── 2. MENTOR group(s): one per (course, mentor) cohort ─────────────
      // Determine which mentor groups to ensure for THIS visitor:
      //   - Student → their own mentor's group (if assigned)
      //   - Mentor (visitor) → all their cohort groups for this course
      //   - Instructor → all mentor groups for this course

      const mentorUsernamesForThisCourse = new Set<string>();
      const ownMentor = ownMentorByCourse.get(courseId);
      if (ownMentor) mentorUsernamesForThisCourse.add(ownMentor);

      if (isMentorOfThisCourse) mentorUsernamesForThisCourse.add(user.username);

      if (isInstructorOfThisCourse) {
        // Pull all distinct mentors assigned to students in this course
        const distinctMentors = await ctx.db.enrolledUsers.findMany({
          where: {
            courseId,
            mentorUsername: { not: null },
          },
          select: { mentorUsername: true },
          distinct: ["mentorUsername"],
        });
        for (const m of distinctMentors)
          if (m.mentorUsername)
            mentorUsernamesForThisCourse.add(m.mentorUsername);
      }

      for (const mentorUsername of mentorUsernamesForThisCourse) {
        const mentorUser = await ctx.db.user.findUnique({
          where: { username: mentorUsername },
          select: { id: true, name: true, image: true },
        });
        if (!mentorUser) continue;

        let mentorGroup = await ctx.db.chatGroup.findFirst({
          where: { courseId, type: "MENTOR", mentorUsername },
        });
        if (!mentorGroup) {
          mentorGroup = await ctx.db.chatGroup.create({
            data: {
              name: `${course.title} · ${mentorUser.name}'s mentees`,
              description: `Mentor group for ${mentorUser.name}'s cohort. Anyone can post.`,
              type: "MENTOR",
              image: course.image,
              courseId,
              mentorUsername,
              organizationId: orgId ?? undefined,
              createdById: mentorUser.id,
            },
          });
          await ctx.db.message.create({
            data: {
              groupId: mentorGroup.id,
              senderId: mentorUser.id,
              content: `Mentor cohort created with ${mentorUser.name}.`,
              type: "ACTIVITY",
              metadata: { event: "GROUP_CREATED" },
            },
          });
        }

        // Mentor of this group is ADMIN
        await ctx.db.groupMember.upsert({
          where: {
            groupId_userId: {
              groupId: mentorGroup.id,
              userId: mentorUser.id,
            },
          },
          create: {
            groupId: mentorGroup.id,
            userId: mentorUser.id,
            role: "ADMIN",
          },
          update: { role: "ADMIN" },
        });

        // Course instructor is ADMIN too
        const instructorId = courseInstructorById.get(courseId);
        if (instructorId && instructorId !== mentorUser.id) {
          await ctx.db.groupMember.upsert({
            where: {
              groupId_userId: {
                groupId: mentorGroup.id,
                userId: instructorId,
              },
            },
            create: {
              groupId: mentorGroup.id,
              userId: instructorId,
              role: "ADMIN",
            },
            update: {},
          });
        }

        // Add the visiting student to their own mentor's group
        if (
          ownMentorByCourse.get(courseId) === mentorUsername &&
          mentorUser.id !== user.id
        ) {
          await ctx.db.groupMember.upsert({
            where: {
              groupId_userId: { groupId: mentorGroup.id, userId: user.id },
            },
            create: {
              groupId: mentorGroup.id,
              userId: user.id,
              role: "MEMBER",
            },
            update: {},
          });
        }

        // If the visitor is the mentor or instructor, backfill all assigned mentees
        if (isMentorOfThisCourse || isInstructorOfThisCourse) {
          const mentees = await ctx.db.enrolledUsers.findMany({
            where: { courseId, mentorUsername },
            include: { user: { select: { id: true } } },
          });
          for (const m of mentees) {
            if (!m.user) continue;
            await ctx.db.groupMember.upsert({
              where: {
                groupId_userId: {
                  groupId: mentorGroup.id,
                  userId: m.user.id,
                },
              },
              create: {
                groupId: mentorGroup.id,
                userId: m.user.id,
                role: "MEMBER",
              },
              update: {},
            });
          }
        }
      }

      synced += 1;
    }

    return { synced };
  }),

  // Count groups with unread messages (for sidebar badge)
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const memberships = await ctx.db.groupMember.findMany({
      where: { userId },
      select: {
        lastReadAt: true,
        group: {
          select: {
            messages: {
              where: { deletedAt: null, senderId: { not: userId } },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { createdAt: true },
            },
          },
        },
      },
    });
    const count = memberships.filter((m) => {
      const last = m.group.messages[0];
      return last && (!m.lastReadAt || last.createdAt > m.lastReadAt);
    }).length;
    return { count };
  }),

  // Create or get 1:1 DM group between two users
  createOrGetDM: protectedProcedure
    .input(z.object({ targetUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (userId === input.targetUserId) throw new TRPCError({ code: "BAD_REQUEST" });

      // Find existing DM between the two users
      const existing = await ctx.db.chatGroup.findFirst({
        where: {
          type: "DIRECT",
          AND: [
            { members: { some: { userId } } },
            { members: { some: { userId: input.targetUserId } } },
            { members: { every: { userId: { in: [userId, input.targetUserId] } } } },
          ],
        },
      });
      if (existing) return { groupId: existing.id };

      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.targetUserId },
        select: { name: true, username: true, image: true },
      });
      if (!targetUser) throw new TRPCError({ code: "NOT_FOUND" });

      const group = await ctx.db.chatGroup.create({
        data: {
          name: `DM`,
          type: "DIRECT",
          createdById: userId,
          organizationId: ctx.session.user.organizationId ?? undefined,
          members: {
            create: [
              { userId, role: "MEMBER" },
              { userId: input.targetUserId, role: "MEMBER" },
            ],
          },
        },
      });

      return { groupId: group.id };
    }),

  // Search org users to add to group
  searchUsers: protectedProcedure
    .input(z.object({ query: z.string(), excludeGroupId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const hasQuery = input.query && input.query.length >= 2;
      if (!hasQuery && input.query && input.query.length > 0) return [];

      const users = await ctx.db.user.findMany({
        where: {
          organizationId: user.organizationId ?? undefined,
          id: { not: user.id },
          ...(hasQuery && {
            OR: [
              { name: { contains: input.query, mode: "insensitive" } },
              { username: { contains: input.query, mode: "insensitive" } },
            ],
          }),
        },
        select: { id: true, name: true, username: true, image: true, role: true },
        orderBy: { name: "asc" },
        take: hasQuery ? 15 : 50,
      });

      if (input.excludeGroupId) {
        const members = await ctx.db.groupMember.findMany({
          where: { groupId: input.excludeGroupId },
          select: { userId: true },
        });
        const memberIds = new Set(members.map((m) => m.userId));
        return users.filter((u) => !memberIds.has(u.id));
      }

      return users;
    }),

  // Update group name/description (admin only, CUSTOM groups only)
  updateGroup: protectedProcedure
    .input(z.object({
      groupId: z.string(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(300).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const member = await ctx.db.groupMember.findUnique({
        where: { groupId_userId: { groupId: input.groupId, userId } },
      });
      if (!member || member.role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN" });
      const group = await ctx.db.chatGroup.findUnique({
        where: { id: input.groupId },
        select: { type: true },
      });
      if (!group || group.type !== "CUSTOM") throw new TRPCError({ code: "FORBIDDEN", message: "Can only edit custom groups" });

      return ctx.db.chatGroup.update({
        where: { id: input.groupId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
        },
      });
    }),

  // Update posting policy (admin only). Works for any group type — useful
  // for instructors to flip COURSE/MENTOR groups between announcement-only
  // and open-discussion modes.
  updatePostingPolicy: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        postingPolicy: z.enum(["EVERYONE", "ADMINS_ONLY"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const member = await ctx.db.groupMember.findUnique({
        where: { groupId_userId: { groupId: input.groupId, userId } },
      });
      if (!member || member.role !== "ADMIN")
        throw new TRPCError({ code: "FORBIDDEN" });
      return ctx.db.chatGroup.update({
        where: { id: input.groupId },
        data: { postingPolicy: input.postingPolicy as any },
      });
    }),

  // Leave a group (cannot leave COURSE or DIRECT groups)
  leaveGroup: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const group = await ctx.db.chatGroup.findUnique({
        where: { id: input.groupId },
        select: { type: true },
      });
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      if (group.type === "COURSE") throw new TRPCError({ code: "FORBIDDEN", message: "Cannot leave course groups" });
      if (group.type === "DIRECT") throw new TRPCError({ code: "FORBIDDEN", message: "Cannot leave DM conversations" });

      await ctx.db.groupMember.delete({
        where: { groupId_userId: { groupId: input.groupId, userId } },
      });
      return { left: true };
    }),

  // Remove a member from a CUSTOM group (admin only, cannot remove self)
  removeMember: protectedProcedure
    .input(z.object({ groupId: z.string(), targetUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (userId === input.targetUserId) throw new TRPCError({ code: "BAD_REQUEST", message: "Use leaveGroup to leave" });

      const [group, requester] = await Promise.all([
        ctx.db.chatGroup.findUnique({ where: { id: input.groupId }, select: { type: true } }),
        ctx.db.groupMember.findUnique({ where: { groupId_userId: { groupId: input.groupId, userId } } }),
      ]);

      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      if (group.type !== "CUSTOM") throw new TRPCError({ code: "FORBIDDEN" });
      if (!requester || requester.role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN" });

      const [targetUser] = await Promise.all([
        ctx.db.user.findUnique({ where: { id: input.targetUserId }, select: { name: true } }),
        ctx.db.groupMember.delete({
          where: { groupId_userId: { groupId: input.groupId, userId: input.targetUserId } },
        }),
      ]);

      if (targetUser) {
        await ctx.db.message.create({
          data: {
            groupId: input.groupId,
            senderId: userId,
            content: `➖ ${targetUser.name} was removed from the group`,
            type: "ACTIVITY",
            metadata: { event: "MEMBER_REMOVED" },
          },
        });
      }
      return { removed: true };
    }),

});
