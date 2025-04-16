import { redirect } from "next/navigation";
import { getServerSession } from "@tutly/auth";
import { db } from "@tutly/db";
import UserCards from "./_components/UserCards";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession();
  const user = session?.user;

  if (!user || (user.role !== "INSTRUCTOR" && user.role !== "MENTOR")) {
    redirect("/404");
  }

  const { search, filter, page, limit } = await searchParams;
  const searchTerm = search as string || "";
  const filters = Array.isArray(filter) ? filter : [];
  const onlineCutoff = new Date(Date.now() - 2 * 60 * 1000);

  const activeFilters = filters
    .map((f) => {
      const [column, operator, value] = f.split(":");
      return { column, operator, value };
    })
    .filter((f) => f.column && f.operator && f.value);

  const enrolledCourses = await db.enrolledUsers.findMany({
    where: {
      username: user.username,
      courseId: {
        not: null,
      },
    },
    select: {
      courseId: true,
    },
  });

  const courseIds = enrolledCourses.map((enrolled) => enrolled.courseId).filter(Boolean);
  const uniqueCourseIds = [...new Set(courseIds)];

  const where: Record<string, any> = {
    courseId: {
      in: uniqueCourseIds,
    },
    user: {
      role: {
        in: ["STUDENT", "MENTOR"],
      },
      organizationId: user.organizationId,
    },
  };

  if (user.role === "MENTOR") {
    where.mentorUsername = user.username;
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
    db.enrolledUsers.count({ where }),
    db.enrolledUsers.count({
      where: {
        ...where,
        user: {
          ...where.user,
          lastSeen: { gte: onlineCutoff },
        },
      },
    }),
  ]);

  const enrolledUsers = await db.enrolledUsers.findMany({
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
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
    distinct: ["username"],
  });

  const users = enrolledUsers.map((enrolled) => ({
    ...enrolled.user,
    courseId: enrolled.courseId,
    mentorUsername: enrolled.mentorUsername,
  }));

  return <UserCards data={users} totalItems={totalItems} activeCount={activeCount} />;
}