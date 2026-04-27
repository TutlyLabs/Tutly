"use client";

import { api } from "@/trpc/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ScrollArea, ScrollBar } from "@tutly/ui/scroll-area";
import { cn } from "@tutly/utils";

const Header = ({
  courseId,
  userRole,
  username: _username,
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
    <div className="mb-4">
      <ScrollArea className="-mx-3 sm:mx-0">
        <div className="flex items-center gap-2 px-3 pb-2 sm:px-0">
          {courses?.data?.map((course) => {
            const params = new URLSearchParams({ id: course.id });
            if (userRole === "MENTOR" && mentorParam) {
              params.set("mentor", mentorParam);
            }
            if (studentParam) {
              params.set("student", studentParam);
            }
            const href = `/tutor/statistics/detail?${params.toString()}`;
            const active = course.id === courseId;
            return (
              <Link
                key={course.id}
                href={href}
                className={cn(
                  "inline-flex h-8 shrink-0 cursor-pointer items-center rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-card text-foreground/70 hover:bg-accent hover:text-foreground",
                )}
              >
                <span className="max-w-[140px] truncate">{course.title}</span>
              </Link>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>
    </div>
  );
};

export default Header;
