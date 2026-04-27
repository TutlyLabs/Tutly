"use client";

import { useState } from "react";

import CourseSelector from "./CourseSelector";
import { InstructorCards } from "./InstructorCards";
import { MentorCards } from "./MentorCards";
import { StudentCards } from "./StudentCards";

const getGreeting = () => {
  const currentIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  const hour = currentIST.getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

interface Props {
  name: string | null;
  currentUser: { role: string };
}

const Dashboard = ({ name, currentUser }: Props) => {
  const [selectedCourse, setSelectedCourse] = useState<string>("");

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId);
  };

  const renderCards = () => {
    if (currentUser.role === "STUDENT") {
      return <StudentCards selectedCourse={selectedCourse} />;
    } else if (currentUser.role === "MENTOR") {
      return <MentorCards selectedCourse={selectedCourse} />;
    } else if (currentUser.role === "INSTRUCTOR") {
      return <InstructorCards selectedCourse={selectedCourse} />;
    }
    return null;
  };

  const isStudent = currentUser.role === "STUDENT";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div
        className={`relative overflow-hidden rounded-xl bg-gradient-to-l from-blue-400 to-blue-600 shadow-md ${
          isStudent ? "sm:pb-20" : "sm:h-40"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10" />
        <div className="relative flex h-full flex-col items-start justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-8 sm:py-6">
          <div className="min-w-0 text-white">
            <p className="text-[11px] font-medium tracking-[0.18em] text-white/80 uppercase">
              {getGreeting()}
            </p>
            <h1 className="mt-1 line-clamp-2 text-xl font-semibold tracking-tight sm:text-2xl">
              {name ? `Hi, ${name} 👋` : "Welcome back 👋"}
            </h1>
          </div>
          <div className="w-full shrink-0 sm:w-auto">
            <CourseSelector
              selectedCourse={selectedCourse}
              onCourseChange={handleCourseChange}
            />
          </div>
        </div>
      </div>

      <div className={isStudent ? "sm:-mt-16" : ""}>{renderCards()}</div>
    </div>
  );
};

export default Dashboard;
