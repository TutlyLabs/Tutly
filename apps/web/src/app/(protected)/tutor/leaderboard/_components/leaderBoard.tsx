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
} from "@tutly/ui/select";
import { ScrollArea, ScrollBar } from "@tutly/ui/scroll-area";
import { useRouter, useSearchParams } from "next/navigation";

import NoDataFound from "@/components/NoDataFound";
import { cn } from "@tutly/utils";

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
  courseId: string | null;
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

  const handleCourseChange = useCallback(
    (courseId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("course", courseId);
      params.delete("mentor");
      router.push(`?${params.toString()}`);
      setActiveMentor(null);
    },
    [router, searchParams],
  );

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
        : true,
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

  const visibleCourses = courses
    ?.filter((c) => c.isPublished)
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Leaderboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Top scorers in your courses.
          </p>
        </div>
        <FaCrown className="hidden h-7 w-7 text-amber-500 sm:block" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ScrollArea className="-mx-3 sm:mx-0">
          <div className="flex items-center gap-2 px-3 pb-2 sm:px-0">
            {visibleCourses?.map((course) => {
              const active = selectedCourse === course.id;
              return (
                <button
                  key={course.id}
                  onClick={() => handleCourseChange(course.id)}
                  className={cn(
                    "inline-flex h-8 shrink-0 cursor-pointer items-center rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "bg-card text-foreground/70 hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span className="max-w-[140px] truncate">{course.title}</span>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>

        {currentUser.role === "INSTRUCTOR" && (
          <Select
            value={activeMentor || ""}
            onValueChange={(value) =>
              setActiveMentor(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="h-9 w-full sm:w-[200px]">
              <SelectValue placeholder="All mentors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All mentors</SelectItem>
              {mentors
                ?.filter((mentor) => mentor.courseId == selectedCourse)
                .map((mentor) => (
                  <SelectItem key={mentor.id} value={mentor.username}>
                    {mentor.username}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {leaderboardData.length === 0 ? (
        <div className="bg-card rounded-xl border p-8 shadow-sm">
          <NoDataFound message="No data yet — submissions will populate the board." />
        </div>
      ) : (
        <ul className="bg-card divide-border divide-y overflow-hidden rounded-xl border shadow-sm">
          {leaderboardData
            .filter((d) => d.totalPoints > 0)
            .map((data, index) => (
              <li
                key={data.userId}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  currentUser.username === data.username && "bg-amber-500/5",
                )}
              >
                <div className="text-muted-foreground w-7 shrink-0 text-center text-sm font-semibold tabular-nums">
                  {index + 1}
                </div>
                <Image
                  src={data.image || "/placeholder.jpg"}
                  alt={data.name}
                  width={36}
                  height={36}
                  className="bg-muted h-9 w-9 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">
                    {data.name}
                  </p>
                  <p className="text-muted-foreground truncate text-[11px]">
                    @{data.username}
                  </p>
                </div>
                <div className="text-foreground shrink-0 text-sm font-semibold tabular-nums">
                  {data.totalPoints}{" "}
                  <span className="text-muted-foreground text-[11px] font-normal">
                    pts
                  </span>
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};

export default LeaderBoard;
