"use client";

import { useState } from "react";
import { Cell, Pie, Tooltip } from "recharts";
import { PieChart as RechartsPieChart, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@tutly/ui/badge";
import { Button } from "@tutly/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@tutly/ui/card";
import { ChartContainer, ChartTooltipContent } from "@tutly/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@tutly/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@tutly/ui/dropdown-menu";
import { Input } from "@tutly/ui/input";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@tutly/ui/dropdown-menu";
import { Search, SlidersHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@tutly/ui/table";
import ProfessionalProfiles from "@/app/(protected)/profile/_components/ProfessionalProfiles";
import { api } from "@/trpc/react";

import Component from "./charts";
import { Skeleton } from "@tutly/ui/skeleton";

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
    <div className="flex w-full min-w-0 flex-col items-center gap-2 rounded-xl border border-white/40 bg-white p-3 text-center shadow-lg shadow-black/5 ring-1 ring-black/5 transition-colors hover:bg-white/95 sm:flex-row sm:items-center sm:gap-4 sm:p-5 sm:text-left">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 sm:h-14 sm:w-14">
        <Image
          src={imgSrc}
          alt={alt}
          width={40}
          height={40}
          className="h-7 w-7 object-contain sm:h-10 sm:w-10"
        />
      </div>
      <div className="flex w-full min-w-0 flex-col items-center sm:items-start">
        <p className="text-xl leading-none font-bold tabular-nums text-blue-600 sm:text-3xl">
          {value}
        </p>
        <h1 className="mt-1 line-clamp-2 w-full text-[10px] font-medium leading-tight tracking-wide text-slate-500 uppercase sm:text-xs sm:font-semibold sm:tracking-normal sm:normal-case sm:text-slate-700">
          {label}
        </h1>
      </div>
    </div>
  );
};

const AssignmentTable = ({
  searchFilteredAssignments,
}: {
  searchFilteredAssignments: (Assignment & { status: string })[];
}) => {
  const router = useRouter();

  const handleAssignmentClick = (assignmentId: string) => {
    router.push(`/assignments/detail?id=${assignmentId}`);
  };

  return (
    <div className="h-[310px] w-full overflow-auto">
      <Table className="min-w-[480px]">
        <TableHeader className="bg-card sticky top-0 z-10">
          <TableRow>
            <TableHead className="whitespace-nowrap">Status</TableHead>
            <TableHead className="whitespace-nowrap">Title</TableHead>
            <TableHead className="whitespace-nowrap">Submissions</TableHead>
            <TableHead className="whitespace-nowrap">Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {searchFilteredAssignments.map((assignment: any) => (
            <TableRow
              key={assignment.id}
              className="hover:bg-accent/40 cursor-pointer text-left transition-colors"
              onClick={() => handleAssignmentClick(assignment.id)}
            >
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
              <TableCell className="font-medium whitespace-nowrap">
                {assignment.title}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {assignment.submissions?.length || 0}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {assignment.submissions?.reduce(
                  (total: any, submission: any) =>
                    total + (submission.points?.[0]?.score || 0),
                  0,
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
    <Card className="bg-card flex-1 rounded-xl border p-5 shadow-sm sm:p-6">
      <h2 className="text-foreground text-base font-semibold sm:text-lg">
        Submission Summary
      </h2>
      <div className="mt-5 flex h-full flex-col justify-center space-y-5">
        {[
          {
            label: "Successfully Submitted",
            count: submittedCount,
            color: "bg-emerald-500",
          },
          {
            label: "Not Submitted",
            count: notSubmittedCount,
            color: "bg-rose-500",
          },
        ].map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="text-foreground flex items-center justify-between text-sm font-medium">
              <span>{item.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {item.count}/{totalAssignments} ·{" "}
                {totalAssignments
                  ? ((item.count / totalAssignments) * 100).toFixed(0)
                  : "0"}
                %
              </span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className={`${item.color} h-full rounded-full transition-all`}
                style={{
                  width: `${totalAssignments ? ((item.count / totalAssignments) * 100).toFixed(2) : 0}%`,
                }}
              />
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

const ProfessionalProfilesModal = ({
  children,
  onUpdate,
}: {
  children: React.ReactNode;
  onUpdate?: (profile: { professionalProfiles: Platforms }) => void;
}) => {
  const { data: userProfile } = api.users.getUserProfile.useQuery();
  const { mutate: updateProfile } = api.users.updateUserProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  const existingProfiles = userProfile?.profile?.professionalProfiles as
    | Record<string, string>
    | undefined;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <ProfessionalProfiles
          professionalProfiles={{
            github: existingProfiles?.github ?? "",
            leetcode: existingProfiles?.leetcode ?? "",
            codechef: existingProfiles?.codechef ?? "",
            codeforces: existingProfiles?.codeforces ?? "",
            hackerrank: existingProfiles?.hackerrank ?? "",
            interviewbit: existingProfiles?.interviewbit ?? "",
          }}
          onUpdate={async (profile: { professionalProfiles: Platforms }) => {
            try {
              const handles = {
                codechef: profile.professionalProfiles?.codechef ?? "",
                codeforces: profile.professionalProfiles?.codeforces ?? "",
                hackerrank: profile.professionalProfiles?.hackerrank ?? "",
                leetcode: profile.professionalProfiles?.leetcode ?? "",
                interviewbit: profile.professionalProfiles?.interviewbit ?? "",
                github: profile.professionalProfiles?.github ?? "",
              };

              updateProfile({
                profile: {
                  professionalProfiles: handles as Record<string, string>,
                },
              });
              onUpdate?.(profile);
            } catch (error) {
              toast.error("Something went wrong");
              console.error(error);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

const PlatformScores = () => {
  const { data: platformScoresData, isLoading } =
    api.codingPlatforms.getPlatformScores.useQuery();

  const platforms = [
    "codechef",
    "codeforces",
    "hackerrank",
    "interviewbit",
    "leetcode",
  ];
  const colors = [
    "var(--color-chart-5)",
    "var(--color-chart-4)",
    "var(--color-chart-3)",
    "var(--color-chart-2)",
    "var(--color-chart-1)",
  ];

  const dummyData = platforms.map((platform) => ({
    name: platform,
    value: 20,
  }));

  const shouldShowUpdateProfile =
    !platformScoresData?.success ||
    !platformScoresData.data ||
    Object.keys(platformScoresData.data.percentages).length === 0;

  const platformData = platforms.map((platform) => ({
    name: platform,
    value: platformScoresData?.data?.percentages[platform] ?? 0,
    originalIndex: platforms.indexOf(platform),
  }));

  const sortedPlatformData = platformData.sort((a, b) => b.value - a.value);

  const data = shouldShowUpdateProfile
    ? dummyData
    : sortedPlatformData.map(({ name, value }) => ({ name, value }));

  const renderChart = () => (
    <div
      className={`flex w-full flex-col items-center gap-8 ${shouldShowUpdateProfile ? "opacity-30" : ""}`}
    >
      <div className="relative h-[180px] w-full">
        {shouldShowUpdateProfile && (
          <ProfessionalProfilesModal onUpdate={() => {}}>
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="bg-foreground/85 text-background hover:bg-foreground cursor-pointer rounded-lg px-4 py-2 text-sm font-medium shadow-md transition-colors">
                Update Profile
              </div>
            </div>
          </ProfessionalProfilesModal>
        )}
        <ChartContainer
          config={Object.fromEntries(
            sortedPlatformData.map((platform, index) => [
              platform.name,
              { label: platform.name, color: colors[index] ?? "" },
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
        {sortedPlatformData.map((platform, index) => {
          const score = platformScoresData?.data?.[platform.name];
          const percentage = platform.value;
          const isPlatformConfigured =
            score !== null && score !== undefined && percentage > 0;

          return (
            <div key={platform.name} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: colors[index] }}
              />
              <div className="flex-1">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground text-xs font-medium capitalize">
                      {platform.name}
                    </span>
                    {!isPlatformConfigured ? (
                      <ProfessionalProfilesModal onUpdate={() => {}}>
                        <span className="text-primary hover:text-primary/80 cursor-pointer text-xs font-medium">
                          Not Configured
                        </span>
                      </ProfessionalProfilesModal>
                    ) : (
                      <span className="text-foreground text-xs font-medium tabular-nums">
                        {`${percentage.toFixed(1)}%`}
                      </span>
                    )}
                  </div>
                  {score &&
                    typeof score === "object" &&
                    "problemCount" in score && (
                      <div className="text-muted-foreground flex justify-between text-[10px] tabular-nums">
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
        <Skeleton className="mx-auto h-48 w-48 rounded-full" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 flex-1 rounded" />
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
    return (
      <div className="space-y-4 sm:space-y-3">
        {/* Stats Cards */}
        <div className="relative z-10 mx-auto grid w-full grid-cols-3 gap-2 px-1 sm:max-w-6xl sm:grid-cols-3 sm:gap-6 sm:px-8 lg:gap-8 lg:px-10">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-white/40 bg-white p-3 shadow-lg shadow-black/5 ring-1 ring-black/5 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
            >
              <Skeleton className="h-10 w-10 rounded-lg sm:h-14 sm:w-14" />
              <div className="flex w-full flex-1 flex-col items-center gap-2 sm:items-start">
                <Skeleton className="h-6 w-12 sm:h-7 sm:w-20" />
                <Skeleton className="h-3 w-24 sm:w-32" />
              </div>
            </div>
          ))}
        </div>

        {/* Assignments Table */}
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="mb-3 w-full lg:w-2/3">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full pb-3 lg:w-1/3">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="mb-3 flex flex-col justify-around gap-3 md:flex-row">
          <div className="flex-1">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
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
    <div className="space-y-4">
      <div className="relative z-10 mx-auto grid w-full grid-cols-3 gap-2 px-1 sm:max-w-6xl sm:grid-cols-3 sm:gap-6 sm:px-8 lg:gap-8 lg:px-10">
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
      <div className="!mt-6 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        <Card className="bg-card flex w-full flex-col rounded-xl border shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex items-center justify-between gap-2 sm:contents">
              <CardTitle className="text-base sm:text-lg">
                Assignments
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-accent h-8 w-8 shrink-0 cursor-pointer sm:order-3"
                    aria-label="Filter assignments"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel>Filter</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {["All", "Submitted", "Not Submitted"].map((status) => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={selectedStatus === status}
                      onCheckedChange={() => setSelectedStatus(status)}
                    >
                      {status}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="relative w-full sm:order-2 sm:ml-auto sm:max-w-[260px]">
              <Search className="text-muted-foreground/70 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search assignments…"
                className="bg-background h-8 pl-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col pt-0">
            <div className="flex-1">
              <AssignmentTable
                searchFilteredAssignments={searchFilteredAssignments}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card flex w-full flex-col rounded-xl border shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">
                Platform Scores
              </CardTitle>
              <CardDescription className="text-xs">
                Your scores on various coding platforms
              </CardDescription>
            </div>
            <Link
              href="/coding-platforms/leaderboard"
              className="text-primary hover:text-primary/80 shrink-0 text-xs font-medium underline-offset-4 hover:underline"
            >
              Leaderboard
            </Link>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center pt-0">
            <PlatformScores />
          </CardContent>
        </Card>
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
    </div>
  );
}
