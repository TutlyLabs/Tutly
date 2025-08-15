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

  return (
    <div className="space-y-4">
      <div className="m-2 h-40 rounded-lg bg-gradient-to-l from-blue-400 to-blue-600">
        <div className="flex flex-col items-center justify-between p-8 md:flex-row">
          <h1 className="text-2xl font-bold text-white">
            {getGreeting()} {name} 👋
          </h1>
          <div className="mt-6 md:mt-0">
            <CourseSelector
              selectedCourse={selectedCourse}
              onCourseChange={handleCourseChange}
            />
          </div>
        </div>
        <div className="p-2 text-center">{renderCards()}</div>
      </div>
    </div>
  );
};

export default Dashboard;
