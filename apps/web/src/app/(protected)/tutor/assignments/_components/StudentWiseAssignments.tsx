"use client";

import { useEffect, useState } from "react";
import { MdOutlineSportsScore } from "react-icons/md";
import { useRouter } from "next/navigation";
import type { Course } from "@tutly/api/schema";

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
          score?: number;
        }[];
        enrolledUser: {
          mentorUsername: string | null;
        };
      }[];
    }[];
  }[];
};

export default function StudentWiseAssignments({
  courses,
  assignments,
  userId,
}: {
  courses: SimpleCourse[];
  assignments: CourseWithAssignments[];
  userId: string;
}) {
  const [currentCourse, setCurrentCourse] = useState<string>(
    courses[0]?.id || "",
  );
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const [unreviewed, setUnreviewed] = useState<string>("all");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {courses?.map((course: any) => {
            return (
              <button
                onClick={() => setCurrentCourse(course.id)}
                className={`rounded p-2 sm:w-auto ${
                  currentCourse === course.id && "rounded border"
                }`}
                key={course.id}
              >
                <h1 className="max-w-xs truncate text-sm font-medium">
                  {course.title}
                </h1>
              </button>
            );
          })}
        </div>
        <div className="m-auto space-x-4 text-sm font-medium sm:m-0">
          <button
            className={`focus:outline-none ${unreviewed === "all" && "border-b-2"}`}
            onClick={() => setUnreviewed("all")}
          >
            <input
              type="radio"
              checked={unreviewed === "all"}
              value={unreviewed === "all" ? "all" : ""}
              name="status"
              id="all"
              className="hidden"
            />
            <label htmlFor="all">All</label>
          </button>
          <button
            className={`focus:outline-none ${unreviewed === "reviewed" && "border-b-2"}`}
            onClick={() => setUnreviewed("reviewed")}
          >
            <input
              type="radio"
              checked={unreviewed === "reviewed"}
              value={unreviewed === "reviewed" ? "reviewed" : ""}
              name="status"
              id="reviewed"
              className="hidden"
            />
            <label htmlFor="reviewed">Reviewed</label>
          </button>
          <button
            className={`focus:outline-none ${unreviewed === "unreviewed" && "border-b-2"}`}
            onClick={() => setUnreviewed("unreviewed")}
          >
            <input
              type="radio"
              checked={unreviewed === "unreviewed"}
              value={unreviewed === "unreviewed" ? "unreviewed" : ""}
              name="status"
              id="unreviewed"
              className="hidden"
            />
            <label htmlFor="unreviewed">UnReviewed</label>
          </button>
          <button
            className={`focus:outline-none ${unreviewed === "not-submitted" && "border-b-2"}`}
            onClick={() => setUnreviewed("not-submitted")}
          >
            <input
              type="radio"
              checked={unreviewed === "not-submitted"}
              value={unreviewed === "not-submitted" ? "not-submitted" : ""}
              name="status"
              id="not-submitted"
              className="hidden"
            />
            <label htmlFor="not-submitted">Not Submitted</label>
          </button>
        </div>
      </div>
      {assignments.map((couse: any) => {
        if (couse.id !== currentCourse) return null;
        return couse.classes.map((cls: any) => {
          return cls.attachments
            .filter((x: any) => {
              if (unreviewed == "all") {
                return true;
              } else if (unreviewed == "not-submitted") {
                return x.submissions.length === 0;
              } else if (unreviewed == "unreviewed") {
                return (
                  x.submissions.length > 0 &&
                  x.submissions.some((x: any) => x.points.length === 0)
                );
              } else if (unreviewed == "reviewed") {
                return (
                  x.submissions.length > 0 &&
                  x.submissions.some((x: any) => x.points.length > 0)
                );
              }
              return true;
            })
            .map((assignment: any) => {
              return (
                <div
                  key={assignment.id}
                  className="rounded-lg border p-1 md:p-3"
                >
                  <div className="flex flex-wrap items-center justify-around p-2 md:justify-between md:p-0 md:px-4">
                    <div className="flex w-full flex-wrap items-center justify-between md:flex-row">
                      <div className="text-sm">
                        <h2 className="m-2 flex-1 font-medium">
                          {assignment.title}
                        </h2>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-white md:gap-6">
                        {assignment.submissions.length === 0 ? (
                          <div className="itens-center flex gap-6">
                            <div className="bg-secondary-600 rounded-full p-2.5">
                              not submitted
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            {assignment.submissions.map(
                              (eachSubmission: any, index: number) => {
                                if (eachSubmission.points.length === 0) {
                                  return (
                                    <div
                                      className="flex items-center gap-6"
                                      key={index}
                                    >
                                      <div className="rounded-full bg-yellow-600 p-2.5 hover:bg-yellow-500">
                                        Under review
                                      </div>
                                    </div>
                                  );
                                } else {
                                  let total = 0;
                                  return (
                                    <div
                                      className="flex items-center gap-6"
                                      key={index}
                                    >
                                      <div className="flex items-center rounded-full bg-green-600 p-2.5">
                                        {eachSubmission.points.forEach(
                                          (point: any) => {
                                            total += point.score;
                                          },
                                        )}
                                        <h1>Score : {total}</h1>
                                        <MdOutlineSportsScore className="inline sm:h-5 sm:w-5" />
                                      </div>
                                    </div>
                                  );
                                }
                              },
                            )}
                          </div>
                        )}
                        <button
                          title="Details"
                          onClick={() => {
                            if (userId) {
                              router.push(
                                `/assignments/${assignment.id}?username=${userId}`,
                              );
                            } else {
                              router.push(`/assignments/${assignment.id}`);
                            }
                          }}
                          className="rounded bg-blue-500 p-2.5"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            });
        });
      })}
    </div>
  );
}
