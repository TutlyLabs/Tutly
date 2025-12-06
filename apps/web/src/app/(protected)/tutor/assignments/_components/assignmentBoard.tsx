"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Course } from "@/lib/prisma";
import NoDataFound from "@/components/NoDataFound";

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

const SingleAssignmentBoard = ({
  courses,
  assignments,
}: {
  courses: SimpleCourse[];
  assignments: CourseWithAssignments[];
}) => {
  const [currentCourse, setCurrentCourse] = useState<string>(
    courses[0]?.id || "",
  );
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const filteredAssignments = assignments;

  filteredAssignments.forEach((course) => {
    course.classes.sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    course.classes.forEach((cls) => {
      cls.attachments.sort((a, b) => {
        return a.title.localeCompare(b.title);
      });
    });
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {courses?.map((course) => (
            <button
              key={course.id}
              onClick={() => setCurrentCourse(course.id)}
              className={`rounded p-2 sm:w-auto ${
                currentCourse === course.id ? "rounded border" : ""
              }`}
            >
              <h1 className="max-w-xs truncate text-sm font-medium">
                {course.title}
              </h1>
            </button>
          ))}
        </div>
      </div>

      {filteredAssignments.length == 0 && (
        <NoDataFound message="No Assignments Found" />
      )}
      {filteredAssignments.map((course) => {
        if (course.id !== currentCourse) return null;
        if (!course.classes || course.classes.length === 0) {
          return <NoDataFound key={course.id} message="No Classes Found" />;
        }
        if (!course.classes.some((cls) => cls.attachments.length > 0)) {
          return <NoDataFound key={course.id} message="No Assignments Found" />;
        }

        return course.classes.map((cls) =>
          cls.attachments.map((assignment) => {
            const assignmentsEvaluated = assignment.submissions.filter(
              (x) => x.points.length > 0,
            );
            return (
              <div key={assignment.id} className="rounded-lg border p-1 md:p-3">
                <div className="flex flex-wrap items-center justify-around p-2 md:justify-between md:p-0 md:px-4">
                  <div className="flex w-full flex-wrap items-center justify-between md:flex-row">
                    <div className="text-sm">
                      <h2 className="mx-2 my-1 flex-1 font-medium">
                        {assignment.title}
                      </h2>
                      <p className="mx-2 mb-1 text-xs text-gray-500">
                        {assignment.class?.title}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-white md:gap-6">
                      <div>
                        <div className="rounded-full bg-green-600 p-2.5">
                          {assignmentsEvaluated.length} evaluated
                        </div>
                      </div>
                      <div>
                        <div className="rounded-full bg-yellow-600 p-2.5">
                          {assignment.submissions.length -
                            assignmentsEvaluated.length}{" "}
                          under review
                        </div>
                      </div>
                      <div className="itens-center flex gap-6">
                        <div className="bg-secondary-600 rounded-full p-2.5">
                          {assignment.submissions.length} submissions
                        </div>
                      </div>
                      <button
                        title="Details"
                        onClick={() =>
                          router.push(`/assignments/${assignment.id}`)
                        }
                        className="rounded bg-blue-500 p-2.5"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }),
        );
      })}
    </div>
  );
};

export default SingleAssignmentBoard;
