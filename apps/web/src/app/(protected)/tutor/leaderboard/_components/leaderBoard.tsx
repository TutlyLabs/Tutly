"use client";

import { useEffect, useState, useCallback } from "react";
import { FaCrown } from "react-icons/fa6";
import Image from "next/image";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";

import NoDataFound from "@/components/NoDataFound";

interface Submission {
  id: string;
  totalPoints: number;
  enrolledUser: {
    user: {
      id: string;
      name: string;
      username: string;
      image: string | null;
    };
    mentor: {
      username: string;
    } | null;
  };
  assignment: {
    class: {
      course: {
        id: string;
      } | null;
    } | null;
  };
  points: Array<{ score: number | null }>;
  rank: number;
}

interface Course {
  id: string;
  title: string;
  isPublished: boolean;
}

interface Mentor {
  id: string;
  username: string;
  name: string;
  image: string | null;
  mobile: string | null;
  courseId:string|null;
}

interface CurrentUser {
  id: string;
  username: string;
  role: string;
  name?: string;
  email?: string | null;
  image?: string | null;
  organizationId?: string | null;
}

interface LeaderboardProps {
  submissions: Submission[];
  courses: Course[];
  currentUser: CurrentUser;
  mentors?: Mentor[];
  selectedCourse?: string | null;
  selectedMentor?: string | null;
}

const LeaderBoard = ({
  submissions,
  courses,
  currentUser,
  mentors,
  selectedCourse,
}: LeaderboardProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeMentor, setActiveMentor] = useState<string | null>(null);

  const handleCourseChange = useCallback((courseId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("course", courseId);
    params.delete("mentor");
    router.push(`?${params.toString()}`);
    setActiveMentor(null);
  }, [router, searchParams]);

  useEffect(() => {
    if (!selectedCourse && courses[0]) {
      handleCourseChange(courses[0].id);
    }
  }, [selectedCourse, courses, handleCourseChange]);

  const [leaderboardData, setLeaderboardData] = useState<
    Array<{
      userId: string;
      totalPoints: number;
      name: string;
      username: string;
      image: string | null;
      rank: number;
    }>
  >([]);

  useEffect(() => {
    const filteredSubmissions = submissions.filter((submission) =>
      currentUser.role === "INSTRUCTOR"
        ? activeMentor
          ? submission.enrolledUser.mentor?.username === activeMentor
          : true
        : true
    );

    const leaderboardMap = new Map<
      string,
      {
        userId: string;
        totalPoints: number;
        name: string;
        username: string;
        image: string | null;
        rank: number;
      }
    >();

    filteredSubmissions.forEach((submission) => {
      const userId = submission.enrolledUser.user.id;
      const totalPoints = submission.totalPoints;
      if (leaderboardMap.has(userId)) {
        leaderboardMap.get(userId)!.totalPoints += totalPoints;
      } else {
        leaderboardMap.set(userId, {
          userId: userId,
          totalPoints: totalPoints,
          name: submission.enrolledUser.user.name,
          username: submission.enrolledUser.user.username,
          image: submission.enrolledUser.user.image,
          rank: submission.rank,
        });
      }
    });

    const leaderboardArray = Array.from(leaderboardMap.values());
    leaderboardArray.sort((a, b) => b.totalPoints - a.totalPoints);

    setLeaderboardData(leaderboardArray);
  }, [selectedCourse, submissions, activeMentor, currentUser.role]);

  return (
    <div className="mx-2 mb-10 mt-6 flex flex-col gap-4 md:mx-14">
      <div className="flex flex-col text-center">
        <FaCrown className="m-auto h-20 w-20 text-blue-500 dark:text-yellow-400" />
        <h1 className="text-2xl font-semibold text-blue-500 dark:text-yellow-400">Leaderboard</h1>
      </div>

      <div className="mt-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-wrap gap-3">
          {courses?.sort((a, b) => a.title.localeCompare(b.title))
          .map((course) => (
            <button
              hidden={!course.isPublished}
              onClick={() => handleCourseChange(course.id)}
              className={`w-20 rounded p-1 px-2 sm:w-auto ${selectedCourse === course.id && "rounded border"
                }`}
              key={course.id}
            >
              <h1 className="max-w-xs truncate text-sm font-medium">{course.title}</h1>
            </button>
          ))}
        </div>

        {currentUser.role === "INSTRUCTOR" && (
          <Select
            value={activeMentor || ""}
            onValueChange={(value) => setActiveMentor(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Mentor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Mentors</SelectItem>
              {mentors?.filter((mentor)=>mentor.courseId==selectedCourse).map((mentor) => (
                <SelectItem key={mentor.id} value={mentor.username}>
                  {mentor.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {leaderboardData.length === 0 ? (
        <NoDataFound message="No data found!" additionalMessage="Nothing here… like a to-do list after exams!"/>
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
                  className={`border-b-2 bg-gradient-to-r p-2 px-4 hover:text-white ${currentUser.username === data.username
                    ? "from-yellow-500/65 via-yellow-600/80 to-yellow-700"
                    : "hover:from-blue-600 hover:to-sky-500"
                    }`}
                  key={data.userId}
                >
                  <td className="pl-12">{index + 1}</td>
                  <td className="flex items-center md:gap-4">
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
                    <h1 className="text-xs font-medium md:text-sm">{data.totalPoints} points</h1>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default LeaderBoard;
