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
    <div className="flex justify-between mx-4 md:mx-8 mb-4">
      <div className="flex flex-wrap gap-2 items-center">
        {courses?.data?.map((course) => (
          <a
            href={`/tutor/statistics/${course.id}${userRole === "MENTOR" ? "?mentor=" + username : ""}`}
            className={`p-2 px-4 border rounded-lg transition-colors hover:bg-accent ${course.id === courseId ? "border-primary bg-accent" : ""
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
