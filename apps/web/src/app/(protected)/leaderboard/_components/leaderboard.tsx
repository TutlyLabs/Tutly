"use client";

import { useEffect, useState } from "react";
import { FaCrown } from "react-icons/fa6";
import Image from "next/image";
import type { User, Course } from "@/lib/prisma";

import NoDataFound from "@/components/NoDataFound";

type SubmissionWithRelations = {
  id: string;
  totalPoints: number;
  submissionDate: Date;
  enrolledUser: {
    user: Pick<User, "id" | "name" | "username" | "image">;
    mentor: {
      username: string;
    };
  };
  assignment: {
    class: {
      course: {
        id: string;
        title: string;
        startDate: Date;
      };
    };
  };
};

type CourseWithClasses = Course & {
  classes: Array<{
    createdAt: Date;
  }>;
};

interface LeaderboardData {
  userId: string;
  totalPoints: number;
  name: string;
  username: string;
  image: string | null;
  rank: number;
}

interface LeaderboardProps {
  currentUser: Pick<User, "id" | "name" | "username" | "image" | "role">;
  submissions: SubmissionWithRelations[];
  courses: CourseWithClasses[];
}

export default function Leaderboard({
  currentUser,
  submissions,
  courses,
}: LeaderboardProps) {
  const [currentCourse, setCurrentCourse] = useState<string>(
    courses[0]?.id || "",
  );
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData[]>([]);

  useEffect(() => {
    const filteredSubmissions = submissions.filter((submission) =>
      currentUser.role === "INSTRUCTOR"
        ? submission.enrolledUser.mentor.username === currentUser.username &&
          submission.assignment.class.course.id === currentCourse
        : submission.assignment.class.course.id === currentCourse,
    );

    const leaderboardMap = new Map<string, LeaderboardData>();

    filteredSubmissions.forEach((submission) => {
      const userId = submission.enrolledUser.user.id;
      const totalPoints = submission.totalPoints;
      if (leaderboardMap.has(userId)) {
        const existing = leaderboardMap.get(userId)!;
        existing.totalPoints += totalPoints;
      } else {
        leaderboardMap.set(userId, {
          userId: userId,
          totalPoints: totalPoints,
          name: submission.enrolledUser.user.name,
          username: submission.enrolledUser.user.username,
          image: submission.enrolledUser.user.image,
          rank: 0,
        });
      }
    });

    const leaderboardArray = Array.from(leaderboardMap.values());
    leaderboardArray.sort((a, b) => b.totalPoints - a.totalPoints);

    setLeaderboardData(leaderboardArray);
  }, [currentCourse, submissions, currentUser.role, currentUser.username]);

  return (
    <div className="mx-2 mt-6 mb-10 flex flex-col gap-4 md:mx-14">
      {/* Leaderboard-header */}
      <div className="flex flex-col text-center">
        <FaCrown className="m-auto h-20 w-20 text-blue-500 dark:text-yellow-400" />
        <h1 className="text-2xl font-semibold text-blue-500 dark:text-yellow-400">
          Leaderboard
        </h1>
      </div>
      {/* Courses list */}
      <div className="mt-4 flex gap-3">
        {courses?.map((course) => (
          <button
            hidden={!course.isPublished}
            onClick={() => setCurrentCourse(course.id)}
            className={`w-20 rounded p-1 px-2 sm:w-auto ${
              currentCourse === course.id && "rounded border"
            }`}
            key={course.id}
          >
            <h1 className="max-w-xs truncate text-sm font-medium">
              {course.title}
            </h1>
          </button>
        ))}
      </div>
      {/* Leaderboard */}
      {leaderboardData.length === 0 ? (
        <NoDataFound message="No data found!" />
      ) : (
        <table>
          <thead className="bg-slate-600 text-white">
            <tr>
              <th className="py-2 pl-12 text-start text-sm uppercase">
                <div className="flex items-center gap-2">Rank</div>
              </th>
              <th className="text-start text-sm uppercase">
                <div className="flex items-center gap-2">Name</div>
              </th>
              <th className="text-start text-sm uppercase">
                <div className="flex items-center gap-2">Points</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((data, index) => {
              if (data.totalPoints === 0) return null;
              return (
                <tr
                  className={`border-b-2 bg-gradient-to-r p-2 px-4 hover:text-white ${
                    currentUser.username === data.username
                      ? "from-yellow-500/65 via-yellow-600/80 to-yellow-700"
                      : "hover:from-blue-600 hover:to-sky-500"
                  }`}
                  key={data.userId}
                >
                  <td className="pl-12">{index + 1}</td>
                  <td className="flex items-center space-x-3 md:gap-4">
                    <Image
                      src={data.image || "/placeholder.jpg"}
                      alt={`User ${index + 1}`}
                      width={35}
                      height={35}
                      className="h-10 w-10 rounded-full"
                    />
                    <div className="py-2">
                      <h1 className="text-md font-medium">{data.name}</h1>
                      <h1 className="text-xs">@{data.username}</h1>
                    </div>
                  </td>
                  <td>
                    <h1 className="text-xs font-medium md:text-sm">
                      {data.totalPoints} points
                    </h1>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
