"use client";

import { useState } from "react";
import { Card, CardContent } from "@tutly/ui/card";
import { Button } from "@tutly/ui/button";
import { Badge } from "@tutly/ui/badge";
import { ScrollArea, ScrollBar } from "@tutly/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tutly/ui/select";
import { usePathname, useRouter } from "next/navigation";
import {
  CheckCircle,
  ChevronRight,
  Clock,
  Eye,
  Trophy,
  XCircle,
} from "lucide-react";
import NoDataFound from "@/components/NoDataFound";
import { cn } from "@tutly/utils";

export default function MobileResponsiveStudentAssignments({
  courses,
  assignments,
  userId,
}: any) {
  const [currentCourse, setCurrentCourse] = useState<string>(courses[0]?.id);
  const router = useRouter();
  const [filterOption, setFilterOption] = useState<string>("all");
  const pathname = usePathname();

  const filterOptions = [
    { value: "all", label: "All", icon: Eye },
    { value: "reviewed", label: "Reviewed", icon: CheckCircle },
    { value: "unreviewed", label: "Unreviewed", icon: Clock },
    { value: "not-submitted", label: "Not Submitted", icon: XCircle },
  ];

  const filteredAssignments =
    assignments
      .find((course: any) => course.id === currentCourse)
      ?.classes.flatMap((cls: any) =>
        cls.attachments.filter((assignment: any) => {
          if (filterOption === "all") return true;
          if (filterOption === "not-submitted")
            return assignment.submissions.length === 0;
          if (filterOption === "unreviewed") {
            return (
              assignment.submissions.length > 0 &&
              assignment.submissions.some((x: any) => x.points.length === 0)
            );
          }
          if (filterOption === "reviewed") {
            return (
              assignment.submissions.length > 0 &&
              assignment.submissions.some((x: any) => x.points.length > 0)
            );
          }
          return true;
        }),
      ) || [];

  const goToDetail = (assignmentId: string) => {
    const url = userId
      ? `/assignments/detail?id=${assignmentId}&username=${userId}`
      : `/assignments/detail?id=${assignmentId}`;
    router.push(url);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Assignments
          </h1>
          <p className="text-muted-foreground text-sm">
            {filteredAssignments.length}{" "}
            {filteredAssignments.length === 1 ? "assignment" : "assignments"}
          </p>
        </div>
        <div className="shrink-0 sm:hidden">
          <Select value={currentCourse} onValueChange={setCurrentCourse}>
            <SelectTrigger
              size="sm"
              className="bg-card h-9 max-w-[160px] rounded-full"
            >
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent align="end">
              {courses?.map((course: any) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <ScrollArea className="-mx-3 hidden min-w-0 flex-1 sm:mx-0 sm:block">
          <div className="flex gap-2 px-3 pb-1 sm:px-0">
            {courses?.map((course: any) => (
              <Button
                key={course.id}
                variant={currentCourse === course.id ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentCourse(course.id)}
                className="h-8 shrink-0 rounded-full whitespace-nowrap"
              >
                {course.title}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>

        <ScrollArea className="-mx-3 sm:mx-0 sm:shrink-0">
          <div className="bg-muted/40 mx-3 inline-flex items-center gap-1 rounded-full p-1 sm:mx-0">
            {filterOptions.map((option) => {
              const Icon = option.icon;
              const active = filterOption === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setFilterOption(option.value)}
                  className={cn(
                    "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/70 hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      {/* List */}
      {filteredAssignments.length === 0 ? (
        <Card className="bg-card rounded-xl border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <NoDataFound message="No assignments found" />
          </CardContent>
        </Card>
      ) : (
        <ul className="bg-card divide-border divide-y overflow-hidden rounded-xl border shadow-sm">
          {filteredAssignments.map((assignment: any) => (
            <li key={assignment.id}>
              <button
                type="button"
                onClick={() => goToDetail(assignment.id)}
                className="hover:bg-accent/40 flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors sm:px-5 sm:py-4"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-foreground truncate text-sm font-medium sm:text-base">
                    {assignment.title}
                  </h4>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {assignment.submissions.length === 0 ? (
                      <Badge
                        variant="destructive"
                        className="h-5 gap-1 rounded-full text-[11px]"
                      >
                        <XCircle className="h-3 w-3" />
                        Not submitted
                      </Badge>
                    ) : (
                      assignment.submissions.map(
                        (submission: any, index: number) => {
                          const isClickable =
                            (pathname.startsWith("/mentor/") ||
                              pathname.startsWith("/instructor/")) &&
                            submission.submissionLink;

                          if (submission.points.length === 0) {
                            return (
                              <Badge
                                key={index}
                                className="h-5 gap-1 rounded-full bg-amber-500 text-[11px] text-white hover:bg-amber-600"
                                onClick={(e) => {
                                  if (isClickable) {
                                    e.stopPropagation();
                                    router.push(submission.submissionLink);
                                  }
                                }}
                              >
                                <Clock className="h-3 w-3" />
                                Under review
                              </Badge>
                            );
                          }
                          const total = submission.points.reduce(
                            (sum: number, point: any) => sum + point.score,
                            0,
                          );
                          return (
                            <Badge
                              key={index}
                              className="h-5 gap-1 rounded-full bg-emerald-500 text-[11px] text-white hover:bg-emerald-600"
                              onClick={(e) => {
                                if (isClickable) {
                                  e.stopPropagation();
                                  router.push(submission.submissionLink);
                                }
                              }}
                            >
                              <Trophy className="h-3 w-3" />
                              {isClickable ? `Score: ${total}` : "Submitted"}
                            </Badge>
                          );
                        },
                      )
                    )}
                  </div>
                </div>
                <ChevronRight className="text-muted-foreground/60 h-5 w-5 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
