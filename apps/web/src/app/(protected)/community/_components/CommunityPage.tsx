"use client";

import { useState } from "react";

import { Tabs } from "@/components/ui/tabs";

import Messages from "./Messages";

interface Course {
  id: string;
  title: string;
  isPublished: boolean;
  doubts: any[];
}

interface MainPageProps {
  allDoubts: Course[];
}

export default function Community({ allDoubts }: MainPageProps) {
  const [currentCourse, setCurrentCourse] = useState<string>(
    allDoubts[0]?.id ?? "",
  );
  const filteredallDoubts = allDoubts.filter((x) => x.id === currentCourse);

  return (
    <div className="flex w-full flex-col gap-4 px-4 py-4 md:px-8">
      <div className="flex flex-wrap gap-3 overflow-x-auto pb-2 sm:flex-nowrap">
        {allDoubts?.map(
          (course) =>
            course.isPublished && (
              <Tabs
                onClick={() => setCurrentCourse(course.id)}
                className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 sm:text-base ${
                  currentCourse === course.id
                    ? "border border-blue-700 bg-blue-600 text-white shadow-lg"
                    : "border border-gray-300 bg-white text-gray-800 hover:bg-blue-50 hover:shadow-md"
                }`}
                key={course?.id}
              >
                <h1 className="max-w-[150px] truncate text-sm font-semibold">
                  {course.title}
                </h1>
              </Tabs>
            ),
        )}
      </div>
      <div className="flex flex-col gap-2">
        {filteredallDoubts?.[0]?.doubts && (
          <Messages
            currentCourseId={currentCourse}
            doubts={filteredallDoubts[0].doubts}
          />
        )}
      </div>
      <div>
        {filteredallDoubts[0]?.doubts.length === 0 && (
          <div className="mt-4 px-2 text-center text-base font-semibold sm:text-lg">
            <h1>Be the first to start a discussion and get the prestige!</h1>
          </div>
        )}
      </div>
    </div>
  );
}
