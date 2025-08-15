"use client";

import { api } from "@/trpc/react";

const Header = ({
  courseId,
  userRole,
  username,
}: {
  courseId: string;
  userRole: "INSTRUCTOR" | "MENTOR";
  username: string;
}) => {
  const { data: courses } = api.courses.getAllCourses.useQuery();

  return (
    <div className="mx-4 mb-4 flex justify-between md:mx-8">
      <div className="flex flex-wrap items-center gap-2">
        {courses?.data?.map((course) => (
          <a
            href={`/tutor/statistics/${course.id}${userRole === "MENTOR" ? "?mentor=" + username : ""}`}
            className={`hover:bg-accent rounded-lg border p-2 px-4 transition-colors ${
              course.id === courseId ? "border-primary bg-accent" : ""
            }`}
            key={course.id}
          >
            {course.title}
          </a>
        ))}
      </div>
    </div>
  );
};

export default Header;
