"use client";

import { useState } from "react";

import { Tabs } from "@/components/ui/tabs";
import type { SessionUser } from "@tutly/auth";

import Messages from "./Messages";

interface Course {
  id: string;
  title: string;
  isPublished: boolean;
  doubts: any[];
}

interface MainPageProps {
  allDoubts: Course[];
  currentUser: SessionUser;
}

export default function Community({ allDoubts, currentUser }: MainPageProps) {
  const [currentCourse, setCurrentCourse] = useState<string>(allDoubts[0]?.id ?? "");
  const filteredallDoubts = allDoubts.filter((x) => x.id === currentCourse);

  if (!currentUser) return <div className="text-center py-8 text-lg">Sign in to view doubts!</div>;

  return (
    <div className="flex w-full flex-col gap-4 px-4 md:px-8 py-4">
      <div className="flex flex-wrap gap-3 sm:flex-nowrap overflow-x-auto pb-2">
        {allDoubts?.map(
          (course) =>
            course.isPublished && (
              <Tabs
                onClick={() => setCurrentCourse(course.id)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm sm:text-base font-medium cursor-pointer transition-colors duration-200 ${currentCourse === course.id
                  ? "bg-blue-600 text-white border border-blue-700 shadow-lg"
                  : "bg-white text-gray-800 border border-gray-300 hover:bg-blue-50 hover:shadow-md"
                  }`}
                key={course?.id}
              >
                <h1 className="max-w-[150px] truncate text-sm font-semibold">{course.title}</h1>
              </Tabs>
            )
        )}
      </div>
      <div className="flex flex-col gap-2">
        {filteredallDoubts?.[0]?.doubts && (
          <Messages
            currentCourseId={currentCourse}
            currentUser={currentUser}
            doubts={filteredallDoubts[0].doubts}
          />
        )}
      </div>
      <div>
        {filteredallDoubts[0]?.doubts.length === 0 && (
          <div className="text-center text-base sm:text-lg font-semibold mt-4 px-2">
            <h1>Be the first to start a discussion and get the prestige!</h1>
          </div>
        )}
      </div>
    </div>
  );
}
