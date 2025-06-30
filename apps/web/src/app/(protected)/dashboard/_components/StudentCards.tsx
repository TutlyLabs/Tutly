"use client";

import { useState } from "react";
import { Cell, Pie, Tooltip } from "recharts";
import { PieChart as RechartsPieChart, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ProfessionalProfiles from "@/app/(protected)/profile/_components/ProfessionalProfiles";
import { api } from "@/trpc/react";

import Component from "./charts";

interface Assignment {
  id: string;
  title: string;
  submissions: {
    id: string;
    points: {
      score: number;
    }[];
  }[];
  points?: number;
}

interface Props {
  selectedCourse: string;
}

const StatCard = ({
  imgSrc,
  alt,
  value,
  label,
}: {
  imgSrc: string;
  alt: string;
  value: number | string;
  label: string;
}) => {
  return (
    <div className="flex w-full flex-col items-center rounded-md bg-white p-4 text-gray-900 shadow-xl sm:w-80 sm:flex-row">
      <div className="flex h-20 w-20 items-center justify-center">
        <Image
          src={imgSrc}
          alt={alt}
          width={80}
          height={80}
          className="object-contain"
        />
      </div>
      <div className="text-center sm:ml-4">
        <p className="pt-3 text-2xl font-bold text-blue-600">{value}</p>
        <h1 className="p-1 text-sm font-bold text-gray-700">{label}</h1>
      </div>
    </div>
  );
};

const AssignmentTable = ({
  searchFilteredAssignments,
}: {
  searchFilteredAssignments: (Assignment & { status: string })[];
}) => {
  return (
    <ScrollArea className="h-[310px] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Submissions</TableHead>
            <TableHead>Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {searchFilteredAssignments.map((assignment) => (
            <TableRow key={assignment.id} className="cursor-pointer text-left">
              <TableCell>
                <Badge
                  variant={
                    assignment.status === "Submitted"
                      ? "default"
                      : "destructive"
                  }
                >
                  {assignment.status}
                </Badge>
              </TableCell>
              <TableCell>{assignment.title}</TableCell>
              <TableCell>{assignment.submissions?.length ?? 0}</TableCell>
              <TableCell>
                {assignment.submissions?.reduce(
                  (total, submission) =>
                    total + (submission.points?.[0]?.score ?? 0),
                  0,
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};

const ProgressBars = ({
  submittedCount,
  notSubmittedCount,
  totalAssignments,
}: {
  submittedCount: number;
  notSubmittedCount: number;
  totalAssignments: number;
}) => {
  return (
    <Card className="flex-1 px-10 py-6">
      <h2 className="text-center text-lg font-semibold dark:text-white">
        Submission Summary
      </h2>
      <div className="flex h-full flex-col justify-center space-y-6">
        {[
          {
            label: "Successfully Submitted",
            count: submittedCount,
            color: "bg-green-600",
          },
          {
            label: "Not Submitted",
            count: notSubmittedCount,
            color: "bg-red-600",
          },
        ].map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between text-base font-medium dark:text-white">
              <span>{item.label}</span>
              <span>
                {item.count}/{totalAssignments} (
                {((item.count / totalAssignments) * 100).toFixed(2)}%)
              </span>
            </div>
            <div className="h-3.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`${item.color} h-3.5 rounded-full`}
                style={{
                  width: `${((item.count / totalAssignments) * 100).toFixed(2)}%`,
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

interface Platforms {
  codechef?: string;
  codeforces?: string;
  hackerrank?: string;
  interviewbit?: string;
  leetcode?: string;
  github?: string;
}

const PlatformScores = () => {
  const { data: platformScoresData, isLoading } =
    api.codingPlatforms.getPlatformScores.useQuery();
  const { mutate: updateProfile } = api.users.updateUserProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  const platforms = [
    "codechef",
    "codeforces",
    "hackerrank",
    "interviewbit",
    "leetcode",
  ];
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  const dummyData = platforms.map((platform) => ({
    name: platform,
    value: 20,
  }));

  const shouldShowUpdateProfile =
    !platformScoresData?.success ||
    platforms.some((platform) => !platformScoresData.data?.[platform]);

  const data =
    platformScoresData?.success && platformScoresData.data
      ? platforms.map((platform) => ({
          name: platform,
          value: platformScoresData.data.percentages[platform] ?? 0,
        }))
      : dummyData;

  const renderChart = () => (
    <div
      className={`flex w-full flex-col items-center gap-8 ${shouldShowUpdateProfile ? "opacity-30" : ""}`}
    >
      <div className="relative h-[180px] w-full">
        {shouldShowUpdateProfile && (
          <Dialog>
            <DialogTrigger asChild>
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="cursor-pointer rounded-lg bg-gray-800/80 px-4 py-2 text-white transition-colors hover:bg-gray-700/80">
                  Update Profile
                </div>
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
              </DialogHeader>
              <ProfessionalProfiles
                professionalProfiles={{
                  github: "",
                  leetcode: "",
                  codechef: "",
                  codeforces: "",
                  hackerrank: "",
                  interviewbit: "",
                }}
                onUpdate={async (profile: {
                  professionalProfiles: Platforms;
                }) => {
                  try {
                    const handles = {
                      codechef: profile.professionalProfiles?.codechef ?? "",
                      codeforces:
                        profile.professionalProfiles?.codeforces ?? "",
                      hackerrank:
                        profile.professionalProfiles?.hackerrank ?? "",
                      leetcode: profile.professionalProfiles?.leetcode ?? "",
                      interviewbit:
                        profile.professionalProfiles?.interviewbit ?? "",
                      github: profile.professionalProfiles?.github ?? "",
                    };

                    updateProfile({
                      profile: {
                        professionalProfiles: handles as Record<string, string>,
                      },
                    });
                  } catch (error) {
                    toast.error("Something went wrong");
                    console.error(error);
                  }
                }}
              />
            </DialogContent>
          </Dialog>
        )}
        <ChartContainer
          config={Object.fromEntries(
            platforms.map((platform, index) => [
              platform,
              { label: platform, color: colors[index] ?? "" },
            ]),
          )}
          className="relative h-[180px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltipContent />} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
      <div className="w-full space-y-2">
        {platforms.map((platform, index) => {
          const score = platformScoresData?.success
            ? platformScoresData.data?.[platform]
            : null;
          const percentage = platformScoresData?.success
            ? (platformScoresData.data?.percentages[platform] ?? 0)
            : 0;

          return (
            <div key={platform} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: colors[index] }}
              />
              <div className="flex-1">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-800 capitalize dark:text-gray-200">
                      {platform}
                    </span>
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                      {platformScoresData?.success
                        ? `${percentage.toFixed(1)}%`
                        : "20%"}
                    </span>
                  </div>
                  {score &&
                    typeof score === "object" &&
                    "problemCount" in score && (
                      <div className="flex justify-between text-[10px] text-gray-600 dark:text-gray-400">
                        <span>Problems: {score.problemCount ?? 0}</span>
                        {score.currentRating && (
                          <span>Rating: {Math.round(score.currentRating)}</span>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex animate-pulse flex-col gap-4">
        <div className="mx-auto h-48 w-48 rounded-full bg-gray-200 dark:bg-gray-700"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-4 flex-1 rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return renderChart();
};

export function StudentCards({ selectedCourse }: Props) {
  const { data: studentDataResponse, isLoading } =
    api.dashboard.getStudentDashboardData.useQuery();
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  if (isLoading) {
    return <div>Loading student data...</div>;
  }

  if (!studentDataResponse?.success || !studentDataResponse.data) {
    return <div>No student data available</div>;
  }

  const studentData = studentDataResponse.data;
  const course = studentData.courses.find((c) => c.courseId === selectedCourse);

  const groupedAssignments: Record<
    string,
    (Assignment & { status: string })[]
  > =
    course?.assignments?.reduce(
      (acc, assignment) => {
        const submissionsCount = assignment.submissions?.length ?? 0;
        let status = "Not Submitted";
        if (submissionsCount > 0) {
          status = "Submitted";
        }

        acc[status] ??= [];
        acc[status]?.push({
          ...assignment,
          status,
          submissions: assignment.submissions ?? [],
        });
        return acc;
      },
      {} as Record<string, (Assignment & { status: string })[]>,
    ) ?? {};

  const filteredAssignments =
    selectedStatus === "All"
      ? Object.values(groupedAssignments).flat()
      : (groupedAssignments[selectedStatus] ?? []);

  const searchFilteredAssignments = filteredAssignments.filter((assignment) =>
    assignment.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalAssignments = course?.assignments.length ?? 0;
  const submittedCount = groupedAssignments?.Submitted?.length ?? 0;
  const notSubmittedCount = groupedAssignments?.["Not Submitted"]?.length ?? 0;

  const completionPercentage =
    Math.round((submittedCount / totalAssignments) * 100) ?? 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap justify-center gap-4 md:mb-10 md:gap-10">
        {[
          {
            imgSrc: "/score.png",
            alt: "score",
            value: course?.totalPoints ?? 0,
            label: "Total Points Earned",
          },
          {
            imgSrc: "/leaderboard.png",
            alt: "completion",
            value: `${completionPercentage}%`,
            label: "Course Completion",
          },
          {
            imgSrc: "/assignment.png",
            alt: "assignment",
            value: course?.assignmentsSubmitted ?? 0,
            label: "Assignments Submitted",
          },
        ].map((item, index) => (
          <StatCard key={index} {...item} />
        ))}
      </div>
      <div className="flex flex-col gap-4 lg:flex-row">
        <Card className="mb-3 w-full lg:w-2/3">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Assignments</CardTitle>
            <div className="flex flex-col gap-4 md:flex-row">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm font-medium text-gray-400"
                  >
                    {selectedStatus}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedStatus("All")}>
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedStatus("Submitted")}
                  >
                    Submitted
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedStatus("Not Submitted")}
                  >
                    Not Submitted
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Input
                type="text"
                placeholder="Search by assignment name"
                className="w-full rounded-md border border-gray-300 p-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <AssignmentTable
              searchFilteredAssignments={searchFilteredAssignments}
            />
          </CardContent>
        </Card>

        <div className="w-full pb-3 lg:w-1/3">
          <Card>
            <CardHeader className="relative">
              <div className="flex items-center justify-center gap-4">
                <CardTitle>Platform Scores</CardTitle>
                <a
                  href="/coding-platforms/leaderboard"
                  className="text-primary hover:text-primary/80 dark:text-primary dark:hover:text-primary/80 absolute right-2 text-xs font-medium underline-offset-4 hover:underline"
                >
                  Leaderboard
                </a>
              </div>
              <CardDescription>
                Your scores on various coding platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlatformScores />
            </CardContent>
          </Card>
        </div>
      </div>

      {Number(totalAssignments) > 0 && (
        <div className="mb-3 flex flex-col justify-around gap-3 md:flex-row">
          <div className="flex-1">
            <Component
              notSubmitted={notSubmittedCount}
              submitted={submittedCount}
            />
          </div>
          <ProgressBars
            submittedCount={submittedCount}
            notSubmittedCount={notSubmittedCount}
            totalAssignments={totalAssignments}
          />
        </div>
      )}
    </>
  );
}
