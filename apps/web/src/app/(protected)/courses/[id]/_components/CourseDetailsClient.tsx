"use client";

import { useRouter } from "next/navigation";
import { FaExternalLinkAlt } from "react-icons/fa";
import type { SessionUser } from "@/lib/auth";

import ClassSidebar from "../classes/_components/classSidebar";
import { api } from "@/trpc/react";

export default function CourseDetailsClient({
  user,
  courseId,
}: {
  user: SessionUser;
  courseId: string;
}) {
  const router = useRouter();
  const { data: assignments } = api.attachments.getCourseAssignments.useQuery({
    courseId,
  });

  if (!user) {
    router.push("/sign-in");
    return null;
  }

  return (
    <div className="flex w-full items-start">
      <ClassSidebar
        courseId={courseId}
        title="Assignments"
        currentUser={user}
        isCourseAdmin={user.role === "INSTRUCTOR"}
      />
      <div className="m-3 w-full">
        <h1 className="border-b-2 p-2 text-center text-lg font-medium md:text-xl">
          Assignments
        </h1>

        <div className="mt-3 grid grid-cols-1 gap-4 p-2 sm:grid-cols-2 md:grid-cols-3">
          {assignments?.data?.length === 0 && (
            <div className="dark:text-secondary-300 mt-5 text-xl">
              No assignments yet...
            </div>
          )}

          {assignments?.data?.map((attachment) => (
            <div
              key={attachment.id}
              className="rounded-lg p-4 text-zinc-600 backdrop-blur-2xl dark:bg-slate-800"
              style={{
                boxShadow:
                  "rgba(60, 64, 67, 0.3) 0px 1px 2px 0px, rgba(60, 64, 67, 0.15) 0px 2px 6px 2px",
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <a
                  href={`/assignments/${attachment.id}`}
                  className="cursor-pointer text-base font-semibold text-blue-600 hover:text-blue-500"
                >
                  {attachment.title}
                </a>
                <div className="gadiv-2 flex items-center text-sm font-medium">
                  {attachment.dueDate &&
                    new Date(attachment.dueDate).toLocaleDateString()}
                  {"  "}
                  {user.role === "STUDENT" && (
                    <div className="text-white">
                      {attachment.submissions.length !== 0 ? (
                        <h1 className="ml-1 rounded-full border-2 border-green-600/80 bg-green-500/40 px-2 py-1 text-xs text-green-600 dark:text-green-400">
                          submitted
                        </h1>
                      ) : (
                        <h1 className="ml-1 rounded-full border-2 border-red-700 bg-red-500/40 px-2 py-1 text-xs text-red-600 dark:text-red-400">
                          not submitted
                        </h1>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-2 mb-2 text-sm font-semibold text-gray-500/85 dark:text-gray-400">
                {/* Markdown preview would go here */}
              </p>
              {attachment.link && (
                <div className="flex items-center justify-start space-x-2 text-sm hover:opacity-90">
                  <a
                    href={attachment.link}
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Assignment
                  </a>
                  <FaExternalLinkAlt className="h-3 w-3" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
