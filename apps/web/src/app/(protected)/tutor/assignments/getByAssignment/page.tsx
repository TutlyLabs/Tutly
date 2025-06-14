import { redirect } from "next/navigation";
import { getServerSessionOrRedirect } from "@tutly/auth";
import { db } from "@tutly/db";
import type { Course } from "@prisma/client";
import NoDataFound from "@/components/NoDataFound";
import SingleAssignmentBoard from "../_components/assignmentBoard";

type SimpleCourse = {
  id: string;
  title: string;
};

type CourseWithAssignments = Course & {
  classes: {
    id: string;
    createdAt: Date;
    attachments: {
      id: string;
      title: string;
      class: {
        title: string;
      } | null;
      submissions: {
        id: string;
        points: {
          id: string;
        }[];
        enrolledUser: {
          mentorUsername: string | null;
        };
      }[];
    }[];
  }[];
};

export default async function GetByAssignmentPage() {
  const session = await getServerSessionOrRedirect();
  const currentUser = session.user;

  if (currentUser.role === "STUDENT") {
    return redirect("/assignments");
  }

  const courses = await db.course.findMany({
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
  }) as SimpleCourse[];

  const coursesWithAssignments = await db.course.findMany({
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
  }) as CourseWithAssignments[];

  const sortedAssignments = coursesWithAssignments.map((course) => ({
    ...course,
    classes: course.classes
      .map((cls) => ({
        ...cls,
        attachments: cls.attachments.sort((a, b) => a.title.localeCompare(b.title)),
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  }));

  return (
    <div className="flex flex-col gap-4 py-2 md:mx-14 md:px-8">
      <div>
        <h1 className="m-2 rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 py-2 text-center text-xl font-semibold">
          Students
        </h1>
        {courses && courses.length > 0 ? (
          <SingleAssignmentBoard
            courses={courses}
            assignments={sortedAssignments}
          />
        ) : (
          <NoDataFound message="No students found!" additionalMessage="It’s a ghost town in here — not a student in sight!"/>
        )}
      </div>
    </div>
  );
} 