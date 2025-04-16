import { redirect } from "next/navigation";
import { getServerSession } from "@tutly/auth";
import { db } from "@tutly/db";
import UserPage from "./_components/UserPage";

export default async function ManageUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession();
  const user = session?.user;

  if (!user || (user.role !== "INSTRUCTOR" && user.role !== "MENTOR")) {
    redirect("/404");
  }

  const { search, sort, direction, filter, page, limit } = await searchParams;
  const searchTerm = search as string || "";
  const sortField = sort as string || "name";
  const sortDirection = direction as string || "asc";
  const filters = Array.isArray(filter) ? filter : [];
  const activeFilters = filters
    .map((f) => {
      const [column, operator, value] = f.split(":");
      return { column, operator, value };
    })
    .filter((f) => f.column && f.operator && f.value);

  const courses = await db.course.findMany({
    where:
      user.role === "INSTRUCTOR"
        ? {
          enrolledUsers: {
            some: {
              username: user.username,
            },
          },
        }
        : {
          enrolledUsers: {
            some: {
              mentorUsername: user.username,
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

  const totalItems = await db.enrolledUsers.count({ where });

  const enrolledUsers = await db.enrolledUsers.findMany({
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
        },
      },
    },
    orderBy: {
      user: {
        [sortField]: sortDirection,
      },
    },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
    distinct: ["username"],
  });

  const allUsers = enrolledUsers.map((enrolled) => ({
    ...enrolled.user,
    courseId: enrolled.courseId,
    mentorUsername: enrolled.mentorUsername,
  }));

  return (
    <UserPage
      data={allUsers}
      totalItems={totalItems}
      userRole={user.role}
      isAdmin={user.isAdmin}
    />
  );
} 