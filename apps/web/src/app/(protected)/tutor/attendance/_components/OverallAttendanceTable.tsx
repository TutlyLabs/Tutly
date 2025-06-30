"use client";

import { ArrowUpDown, Search } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface StudentAttendance {
  name: string;
  username: string;
  image: string | null;
  percentage: number;
  classesAttended: number;
  totalClasses: number;
  [key: string]: string | number | null;
}

type SortKey = keyof StudentAttendance;

interface OverallAttendanceTableProps {
  studentsAttendance: StudentAttendance[];
}

const OverallAttendanceTable = ({
  studentsAttendance,
}: OverallAttendanceTableProps) => {
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredData = Array.isArray(studentsAttendance)
    ? studentsAttendance.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      )
    : [];

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortConfig === null) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (
      aValue === null ||
      bValue === null ||
      aValue === undefined ||
      bValue === undefined
    )
      return 0;
    if (aValue < bValue) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key: SortKey) => {
    if (key === "reset") {
      setSortConfig(null);
      return;
    }
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  return (
    <div className="w-full max-w-[100vw] px-2 pt-2 sm:px-3 sm:pt-4 md:px-4 md:pt-6 lg:px-6 lg:pt-8 xl:px-8 2xl:px-12">
      <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-3 md:gap-4">
          <h1 className="text-primary text-base font-bold sm:text-lg md:text-xl lg:text-2xl">
            Overall Attendance
          </h1>

          <div className="xs:flex-col xs:gap-3 flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4 md:gap-5 lg:gap-6">
            <div className="order-1 mb-2 flex w-full items-center gap-2 sm:mb-0 sm:w-auto">
              <div className="relative w-full flex-1 sm:w-40 sm:flex-none md:w-48 lg:w-64">
                <Search className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 sm:h-4 sm:w-4" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-full pl-8 text-xs sm:h-9 sm:text-sm md:h-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortConfig(null)}
                className="h-8 px-2 text-xs whitespace-nowrap sm:h-9 sm:px-3 sm:text-sm md:h-10 md:px-4"
              >
                Reset
              </Button>
            </div>

            <div className="order-2 flex w-full flex-wrap items-center justify-start gap-3 sm:w-auto sm:justify-end sm:gap-4 md:gap-5">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
                <span className="text-muted-foreground text-xs whitespace-nowrap sm:text-sm">
                  Above 75%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
                <span className="text-muted-foreground text-xs whitespace-nowrap sm:text-sm">
                  Below 75%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent relative mt-3 w-full overflow-x-auto sm:mt-4 md:mt-5">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden">
            <Table className="divide-border min-w-full divide-y">
              <TableHeader>
                <TableRow className="hover:bg-muted/50">
                  <TableHead className="w-10 py-2 text-xs sm:w-12 sm:py-2.5 sm:text-sm md:w-14 md:py-3 lg:w-16">
                    S.No
                  </TableHead>
                  <TableHead className="py-2 sm:py-2.5 md:py-3">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("name")}
                      className="flex h-auto items-center gap-1 py-1 text-xs sm:gap-2 sm:text-sm"
                    >
                      Name
                      <ArrowUpDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="hidden py-2 sm:table-cell sm:py-2.5 md:py-3">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("username")}
                      className="flex h-auto items-center gap-1 py-1 text-xs sm:gap-2 sm:text-sm"
                    >
                      Roll Number
                      <ArrowUpDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="py-2 sm:py-2.5 md:py-3">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("percentage")}
                      className="flex h-auto items-center gap-1 py-1 text-xs sm:gap-2 sm:text-sm"
                    >
                      <span className="whitespace-nowrap">Attendance %</span>
                      <ArrowUpDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="py-2 text-xs whitespace-nowrap sm:py-2.5 sm:text-sm md:py-3">
                    Classes Attended
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground py-8 text-center sm:py-12 md:py-16"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-muted-foreground/60 h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        <p className="text-sm sm:text-base">
                          No attendance data available
                        </p>
                        <p className="text-muted-foreground/80 text-xs sm:text-sm">
                          Student attendance records will appear here when
                          available
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.map((item: StudentAttendance, index: number) => (
                    <TableRow key={item.username} className="hover:bg-muted/50">
                      <TableCell className="py-2 text-xs font-medium sm:py-2.5 sm:text-sm md:py-3">
                        {index + 1}
                      </TableCell>
                      <TableCell className="py-2 sm:py-2.5 md:py-3">
                        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                          <div className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-full sm:h-8 sm:w-8 md:h-10 md:w-10">
                            <Image
                              src={
                                item.image ||
                                "https://i.postimg.cc/zXj77wQG/image.png"
                              }
                              fill
                              sizes="(max-width: 640px) 24px, (max-width: 768px) 32px, 40px"
                              alt={`${item.name}'s profile image`}
                              className="object-cover"
                            />
                          </div>
                          <span className="text-xs font-medium sm:text-sm md:text-base">
                            {item.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden py-2 text-xs sm:table-cell sm:py-2.5 sm:text-sm md:py-3">
                        {item.username}
                      </TableCell>
                      <TableCell className="py-2 sm:py-2.5 md:py-3">
                        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 md:h-3 md:w-3",
                              item.percentage < 75
                                ? "bg-red-500"
                                : "bg-emerald-500",
                            )}
                          />
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-xs font-medium sm:px-2 sm:py-0.5 md:px-2.5 md:py-1",
                              item.percentage < 75
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            )}
                          >
                            {Math.round(item.percentage)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-xs font-medium whitespace-nowrap sm:py-2.5 sm:text-sm md:py-3">
                        <span
                          className={cn(
                            item.classesAttended / item.totalClasses < 0.75
                              ? "text-red-600 dark:text-red-400"
                              : "text-emerald-600 dark:text-emerald-400",
                          )}
                        >
                          {item.classesAttended || 0}
                        </span>
                        <span className="text-muted-foreground mx-0.5">/</span>
                        <span>{item.totalClasses || 0}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {sortedData.length > 0 && (
        <div className="text-muted-foreground mt-3 flex flex-wrap items-center justify-between gap-2 text-xs sm:mt-4 sm:text-sm md:mt-5">
          <span>
            Showing {sortedData.length}{" "}
            {sortedData.length === 1 ? "student" : "students"}
          </span>
          <span className="text-xs">
            {sortedData.filter((s) => s.percentage >= 75).length} students with
            attendance ≥75%
          </span>
        </div>
      )}
    </div>
  );
};

export default OverallAttendanceTable;
