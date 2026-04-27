"use client";

import { useEffect, useState } from "react";
import { MdOutlineSportsScore } from "react-icons/md";
import { useRouter } from "next/navigation";
import type { Course } from "@tutly/db/browser";

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
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium md:gap-2">
                        {assignment.submissions.length === 0 ? (
                          <span className="bg-rose-500/15 border-rose-500/30 inline-flex items-center rounded-full border px-2.5 py-1 text-rose-700 dark:text-rose-400">
                            Not submitted
                          </span>
                        ) : (
                          assignment.submissions.map(
                            (eachSubmission: any, index: number) => {
                              if (eachSubmission.points.length === 0) {
                                return (
                                  <span
                                    key={index}
                                    className="bg-amber-500/15 border-amber-500/30 inline-flex items-center rounded-full border px-2.5 py-1 text-amber-700 dark:text-amber-400"
                                  >
                                    Under review
                                  </span>
                                );
                              }
                              const total = eachSubmission.points.reduce(
                                (sum: number, point: any) =>
                                  sum + (point.score || 0),
                                0,
                              );
                              return (
                                <span
                                  key={index}
                                  className="bg-emerald-500/15 border-emerald-500/30 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-emerald-700 dark:text-emerald-400"
                                >
                                  Score: {total}
                                  <MdOutlineSportsScore className="h-3.5 w-3.5" />
                                </span>
                              );
                            },
                          )
                        )}
                        <button
                          title="Details"
                          onClick={() => {
                            if (userId) {
                              router.push(
                                `/assignments/detail?id=${assignment.id}&username=${userId}`,
                              );
                            } else {
                              router.push(
                                `/assignments/detail?id=${assignment.id}`,
                              );
                            }
                          }}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-7 cursor-pointer items-center rounded-full px-3 text-[11px] font-medium transition-colors"
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
