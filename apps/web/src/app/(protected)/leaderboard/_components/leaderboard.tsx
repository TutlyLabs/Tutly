"use client";

import { useEffect, useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import Image from "next/image";
import type { User, Course } from "@tutly/db/browser";

import { ScrollArea, ScrollBar } from "@tutly/ui/scroll-area";
import NoDataFound from "@/components/NoDataFound";
import { cn } from "@tutly/utils";

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

  const visibleCourses = useMemo(
    () => courses.filter((c) => c.isPublished),
    [courses],
  );

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
          userId,
          totalPoints,
          name: submission.enrolledUser.user.name,
          username: submission.enrolledUser.user.username,
          image: submission.enrolledUser.user.image,
          rank: 0,
        });
      }
    });
    const arr = Array.from(leaderboardMap.values())
      .filter((d) => d.totalPoints > 0)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((d, i) => ({ ...d, rank: i + 1 }));
    setLeaderboardData(arr);
  }, [currentCourse, submissions, currentUser.role, currentUser.username]);

  const top3 = leaderboardData.slice(0, 3);
  const rest = leaderboardData.slice(3);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Leaderboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Top scorers in this course.
          </p>
        </div>
        <Trophy className="text-amber-500 hidden h-8 w-8 sm:block" />
      </div>

      {/* Course chips */}
      <ScrollArea className="-mx-3 sm:mx-0">
        <div className="flex items-center gap-2 px-3 pb-2 sm:px-0">
          {visibleCourses.map((course) => {
            const active = currentCourse === course.id;
            return (
              <button
                key={course.id}
                onClick={() => setCurrentCourse(course.id)}
                className={cn(
                  "inline-flex h-8 shrink-0 cursor-pointer items-center rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-card text-foreground/70 hover:bg-accent hover:text-foreground",
                )}
              >
                {course.title}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>

      {leaderboardData.length === 0 ? (
        <div className="bg-card rounded-xl border p-8 shadow-sm">
          <NoDataFound message="No data found yet — submit assignments to climb the board." />
        </div>
      ) : (
        <>
          {/* Top-3 podium — 2 / 1 / 3, aligned flush at the bottom */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3 sm:gap-4">
              {[top3[1], top3[0], top3[2]].map((entry, displayIdx) => {
                if (!entry) return null;
                const realRank =
                  displayIdx === 0 ? 2 : displayIdx === 1 ? 1 : 3;
                return (
                  <PodiumCard
                    key={entry.userId}
                    entry={entry}
                    rank={realRank}
                    isMe={entry.username === currentUser.username}
                  />
                );
              })}
            </div>
          )}

          {/* Remaining list */}
          {rest.length > 0 && (
            <ul className="bg-card divide-border divide-y overflow-hidden rounded-xl border shadow-sm">
              {rest.map((entry) => (
                <li
                  key={entry.userId}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    entry.username === currentUser.username &&
                      "bg-amber-500/5",
                  )}
                >
                  <div className="text-muted-foreground w-7 shrink-0 text-center text-sm font-semibold tabular-nums">
                    {entry.rank}
                  </div>
                  <Image
                    src={entry.image || "/placeholder.jpg"}
                    alt={entry.name}
                    width={36}
                    height={36}
                    className="bg-muted h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-medium">
                      {entry.name}
                    </p>
                    <p className="text-muted-foreground truncate text-[11px]">
                      @{entry.username}
                    </p>
                  </div>
                  <div className="text-foreground shrink-0 text-sm font-semibold tabular-nums">
                    {entry.totalPoints}{" "}
                    <span className="text-muted-foreground text-[11px] font-normal">
                      pts
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function PodiumCard({
  entry,
  rank,
  isMe,
}: {
  entry: LeaderboardData;
  rank: number;
  isMe: boolean;
}) {
  const tones: Record<number, { gradient: string; ring: string }> = {
    1: { gradient: "from-amber-500/20", ring: "ring-amber-500" },
    2: { gradient: "from-zinc-400/15", ring: "ring-zinc-400" },
    3: { gradient: "from-orange-700/15", ring: "ring-orange-700" },
  };
  const medal: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const topPad: Record<number, string> = {
    1: "sm:pt-10",
    2: "sm:pt-6",
    3: "sm:pt-4",
  };
  const t = tones[rank]!;
  return (
    <div
      className={cn(
        "bg-card relative flex w-full min-w-0 flex-col items-center gap-2 overflow-hidden rounded-2xl border p-5 pb-6 text-center shadow-sm",
        "bg-gradient-to-b to-transparent",
        t.gradient,
        topPad[rank],
        rank === 1 && "border-amber-500/30 shadow-md",
        isMe && "ring-primary/60 ring-2",
      )}
    >
      <span className="absolute top-3 right-3 text-2xl">{medal[rank]}</span>
      <Image
        src={entry.image || "/placeholder.jpg"}
        alt={entry.name}
        width={64}
        height={64}
        className={cn(
          "bg-muted rounded-full object-cover ring-2 ring-offset-2",
          rank === 1 ? "h-16 w-16" : "h-14 w-14",
          t.ring,
        )}
      />
      <p
        className={cn(
          "text-foreground line-clamp-1 w-full px-1 font-semibold",
          rank === 1 ? "text-base" : "text-sm",
        )}
        title={entry.name}
      >
        {entry.name}
      </p>
      <p className="text-muted-foreground -mt-1 line-clamp-1 w-full px-1 text-[11px]">
        @{entry.username}
      </p>
      <p
        className={cn(
          "text-foreground mt-1 font-bold tabular-nums",
          rank === 1 ? "text-2xl" : "text-lg",
        )}
      >
        {entry.totalPoints}{" "}
        <span className="text-muted-foreground text-xs font-normal">pts</span>
      </p>
    </div>
  );
}
