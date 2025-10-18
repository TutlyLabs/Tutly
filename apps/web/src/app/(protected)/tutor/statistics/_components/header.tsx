"use client";

import { api } from "@/trpc/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();

  const studentParam = searchParams.get("student");
  const mentorParam = searchParams.get("mentor");

  return (
    <div className="mx-4 mb-4 flex justify-between md:mx-8">
      <div className="flex flex-wrap items-center gap-2">
        {courses?.data?.map((course) => {
          const params = new URLSearchParams();
          if (userRole === "MENTOR" && mentorParam) {
            params.set("mentor", mentorParam);
          }
          if (studentParam) {
            params.set("student", studentParam);
          }

          const queryString = params.toString();
          const href = `/tutor/statistics/${course.id}${queryString ? `?${queryString}` : ""}`;

          return (
            <Link
              href={href}
              className={`hover:bg-accent rounded-lg border p-2 px-4 transition-colors ${
                course.id === courseId ? "border-primary bg-accent" : ""
              }`}
              key={course.id}
            >
              {course.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Header;
