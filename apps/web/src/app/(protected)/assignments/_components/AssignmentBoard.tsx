"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePathname, useRouter } from "next/navigation";
import {
  Trophy,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import NoDataFound from "@/components/NoDataFound";

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

  const getStatusConfig = (assignment: any) => {
    if (assignment.submissions.length === 0) {
      return {
        status: "Not submitted",
        color: "bg-red-500",
        textColor: "text-white",
        icon: XCircle,
      };
    }

    const hasUnreviewed = assignment.submissions.some(
      (sub: any) => sub.points.length === 0,
    );
    const hasReviewed = assignment.submissions.some(
      (sub: any) => sub.points.length > 0,
    );

    if (hasUnreviewed && !hasReviewed) {
      return {
        status: "Under review",
        color: "bg-yellow-500",
        textColor: "text-white",
        icon: Clock,
      };
    }

    if (hasReviewed) {
      const totalScore = assignment.submissions.reduce(
        (total: number, sub: any) => {
          return (
            total +
            sub.points.reduce(
              (subTotal: number, point: any) => subTotal + point.score,
              0,
            )
          );
        },
        0,
      );
      return {
        status: `Score: ${totalScore}`,
        color: "bg-green-500",
        textColor: "text-white",
        icon: Trophy,
      };
    }

    return {
      status: "Submitted",
      color: "bg-green-500",
      textColor: "text-white",
      icon: CheckCircle,
    };
  };

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

  return (
    <div className="flex flex-col gap-4 p-2">
      {/* Course Selection - Horizontal Scroll on Mobile */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Courses</h2>
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {courses?.map((course: any) => (
              <Button
                key={course.id}
                variant={currentCourse === course.id ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentCourse(course.id)}
                className="flex-shrink-0 whitespace-nowrap"
              >
                {course.title}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Assignments List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between max-sm:flex-col">
          <h3 className="text-2xl font-medium max-sm:mb-2 max-sm:text-lg">
            Assignments ({filteredAssignments.length})
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {filterOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  variant={
                    filterOption === option.value ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setFilterOption(option.value)}
                  className="flex items-center justify-center gap-2 sm:justify-start"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">{option.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {filteredAssignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <NoDataFound message="No Assignments Found"></NoDataFound>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAssignments.map((assignment: any) => {
              return (
                <Card
                  key={assignment.id}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between space-y-3 max-sm:flex-col">
                      <div>
                        <h4 className="text-xl font-medium max-sm:text-lg">
                          {assignment.title}
                        </h4>
                      </div>

                      {/* Status and Actions */}
                      <div className="flex gap-5 sm:flex-row sm:items-center sm:justify-between">
                        {/* Status Badges */}
                        <div className="flex flex-wrap gap-2">
                          {assignment.submissions.length === 0 ? (
                            <Badge
                              variant="destructive"
                              className="flex items-center gap-1 rounded-full text-sm max-sm:text-xs"
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
                                      variant="secondary"
                                      className={`flex items-center gap-1 rounded-full bg-yellow-500 text-sm text-white hover:bg-yellow-600 max-sm:text-xs ${
                                        isClickable ? "cursor-pointer" : ""
                                      }`}
                                      onClick={() =>
                                        isClickable &&
                                        router.push(submission.submissionLink)
                                      }
                                    >
                                      <Clock className="h-3 w-3" />
                                      Under review
                                    </Badge>
                                  );
                                } else {
                                  const total = submission.points.reduce(
                                    (sum: number, point: any) =>
                                      sum + point.score,
                                    0,
                                  );
                                  return (
                                    <Badge
                                      key={index}
                                      variant="secondary"
                                      className={`flex items-center gap-1 rounded-full bg-green-500 text-sm text-white hover:bg-green-600 max-sm:text-xs ${
                                        isClickable ? "cursor-pointer" : ""
                                      }`}
                                      onClick={() =>
                                        isClickable &&
                                        router.push(submission.submissionLink)
                                      }
                                    >
                                      <Trophy className="h-3 w-3" />
                                      {isClickable
                                        ? `Score: ${total}`
                                        : "Submitted"}
                                    </Badge>
                                  );
                                }
                              },
                            )
                          )}
                        </div>

                        {/* View Details Button */}
                        <Button
                          onClick={() => {
                            const url = userId
                              ? `/assignments/${assignment.id}?username=${userId}`
                              : `/assignments/${assignment.id}`;
                            router.push(url);
                          }}
                          className="text-md w-24 p-4 max-sm:p-3 max-sm:text-sm"
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
