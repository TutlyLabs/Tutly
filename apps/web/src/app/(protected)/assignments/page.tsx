import { db } from "@tutly/db";
import AssignmentBoard from "./_components/AssignmentBoard";
import NoDataFound from "@/components/NoDataFound";
import { getServerSessionOrRedirect } from "@tutly/auth";

export default async function AssignmentsPage() {
  const session = await getServerSessionOrRedirect();

  const coursesData = await db.course.findMany({
    where: {
      enrolledUsers: {
        some: {
          username: session.user.username,
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

  coursesData.forEach((course) => {
    course.classes.sort((a, b) => {
      return Number(a.createdAt) - Number(b.createdAt);
    });
  });
  const publishedCourses = coursesData.filter((course) => course.isPublished);
  const courses = session.user.role === "INSTRUCTOR" ? coursesData : publishedCourses;

  const assignments = await db.course.findMany({
    where: {
      enrolledUsers: {
        some: {
          username: session.user.username,
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
                    username: session.user.username,
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

  return (
    <div className="mx-2 flex flex-col gap-4 px-2 py-2 md:px-6">
      {!courses || courses.length === 0 ? (
        <div className="mt-20 p-4 text-center font-semibold">
          <NoDataFound message="No Assignments available" additionalMessage="Assignment-free moment!"/>
        </div>
      ) : (
        <AssignmentBoard reviewed={true} courses={courses} assignments={assignments} />
      )}
    </div>
  );
}