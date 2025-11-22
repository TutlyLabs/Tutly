import { redirect } from "next/navigation";
import { getServerSessionOrRedirect } from "@/lib/auth";
import { db } from "@/lib/db";
import AssignmentPage from "../_components/AssignmentPage";
import type { Attachment, submission as Submission } from "@prisma/client";
import { isFeatureEnabled } from "@/lib/featureFlags";

interface AssignmentPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    username?: string;
    page?: string;
    limit?: string;
    mentor?: string;
    search?: string;
  }>;
}

type EnrolledUserType = {
  username: string;
  mentorUsername: string | null;
};

type SubmissionWithDetails = Submission & {
  enrolledUser: EnrolledUserType;
  points: Array<{
    category: string;
    score: number;
  }>;
};

type CourseWithEnrolled = {
  id: string;
  title: string;
  createdById: string;
  enrolledUsers: EnrolledUserType[];
};

type AssignmentWithSubmissions = Attachment & {
  submissions: SubmissionWithDetails[];
  course: CourseWithEnrolled | null;
  class: {
    id: string;
    course: {
      id: string;
      title: string;
      createdById: string;
    } | null;
  } | null;
  totalCount?: number;
};

export default async function AssignmentDetailPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: AssignmentPageProps) {
  const { user } = await getServerSessionOrRedirect();

  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;

  const username = searchParams.username;
  const page = parseInt(searchParams.page || "1");
  const limit = parseInt(searchParams.limit || "10");
  const selectedMentor = searchParams.mentor;
  const searchQuery = searchParams.search || "";
  const skip = (page - 1) * limit;

  if (!user) return null;

  const baseInclude = {
    class: {
      select: {
        id: true,
        title: true,
        videoId: true,
        folderId: true,
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

  const assignment =
    await (async (): Promise<AssignmentWithSubmissions | null> => {
      if (user.role === "INSTRUCTOR") {
        const [rawAssignmentData, totalCount] = await Promise.all([
          db.attachment.findUnique({
            where: { id: params.id },
            include: {
              ...baseInclude,
              submissions: {
                where: {
                  status: "SUBMITTED",
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
                  enrolledUsers: {
                    where: {
                      user: {
                        organizationId: user.organizationId,
                      },
                    },
                    select: {
                      username: true,
                      mentorUsername: true,
                    },
                  },
                  classes: true,
                },
              },
            },
          }),
          db.submission.count({
            where: {
              attachmentId: params.id,
              status: "SUBMITTED",
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

        if (!rawAssignmentData) return null;

        const assignmentData =
          rawAssignmentData as unknown as AssignmentWithSubmissions;
        return {
          ...assignmentData,
          totalCount,
          submissions: assignmentData.submissions || [],
          course: assignmentData.course || null,
        };
      } else if (user.role === "MENTOR") {
        const [rawAssignmentData, totalCount] = await Promise.all([
          db.attachment.findUnique({
            where: { id: params.id },
            include: {
              ...baseInclude,
              submissions: {
                where: {
                  status: "SUBMITTED",
                  AND: [
                    {
                      enrolledUser: {
                        mentorUsername: user.username,
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
                      mentorUsername: user.username,
                    },
                    select: {
                      username: true,
                      mentorUsername: true,
                    },
                  },
                  classes: true,
                },
              },
            },
          }),
          db.submission.count({
            where: {
              attachmentId: params.id,
              status: "SUBMITTED",
              AND: [
                {
                  enrolledUser: {
                    mentorUsername: user.username,
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

        if (!rawAssignmentData) return null;

        const assignmentData =
          rawAssignmentData as unknown as AssignmentWithSubmissions;
        return {
          ...assignmentData,
          totalCount,
          submissions: assignmentData.submissions || [],
          course: assignmentData.course || null,
        };
      } else {
        const rawAssignmentData = await db.attachment.findUnique({
          where: { id: params.id },
          include: {
            ...baseInclude,
            submissions: {
              where: {
                status: "SUBMITTED",
                enrolledUser: {
                  user: {
                    id: user.id,
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

        if (!rawAssignmentData) return null;

        const assignmentData =
          rawAssignmentData as unknown as AssignmentWithSubmissions;
        return {
          ...assignmentData,
          submissions: assignmentData.submissions || [],
          course: assignmentData.course || null,
        };
      }
    })();

  if (!assignment) {
    redirect("/assignments");
  }

  const notSubmittedMentees =
    assignment.course?.enrolledUsers?.filter(
      (enrolled: EnrolledUserType) =>
        !assignment.submissions?.some(
          (submission) =>
            submission.enrolledUser.username === enrolled.username,
        ),
    ) ?? [];

  const sortedAssignments = [...(assignment.submissions ?? [])].sort((a, b) =>
    a.enrolledUser.username.localeCompare(b.enrolledUser.username),
  );

  const isCourseAdmin =
    user.role === "INSTRUCTOR"
      ? user.id === assignment.course?.createdById
      : (user?.adminForCourses?.some(
          (course) => course.id === assignment.courseId,
        ) ?? false);

  const totalPages = Math.ceil((assignment.totalCount ?? 0) / limit);

  const mentors = assignment?.course?.enrolledUsers
    ? Array.from(
        new Set(
          assignment.course.enrolledUsers
            .map((enrolledUser) => enrolledUser.mentorUsername)
            .filter(Boolean),
        ),
      )
    : [];

  const isSandboxSubmissionEnabled = await isFeatureEnabled(
    "sandbox_submission",
    user,
  );

  return (
    <AssignmentPage
      currentUser={user}
      assignment={assignment}
      assignments={sortedAssignments}
      notSubmittedMentees={notSubmittedMentees}
      isCourseAdmin={isCourseAdmin}
      username={username ?? ""}
      mentors={mentors as string[]}
      pagination={{
        currentPage: page,
        totalPages,
        pageSize: limit,
      }}
      isSandboxSubmissionEnabled={isSandboxSubmissionEnabled ?? false}
    />
  );
}
