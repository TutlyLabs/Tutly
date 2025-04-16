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

const OverallAttendanceTable = ({ studentsAttendance }: OverallAttendanceTableProps) => {
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredData = Array.isArray(studentsAttendance)
    ? studentsAttendance.filter((item) =>
      Object.values(item).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
    : [];

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortConfig === null) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue === null || bValue === null || aValue === undefined || bValue === undefined) return 0;
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
    <div className="w-full max-w-[100vw] px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 2xl:px-12 pt-2 sm:pt-4 md:pt-6 lg:pt-8">
      <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 md:gap-4">
          <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-primary">
            Overall Attendance
          </h1>
          
          <div className="flex flex-col xs:flex-col sm:flex-row w-full sm:w-auto items-start sm:items-center 
                         gap-3 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            
            <div className="flex w-full sm:w-auto items-center gap-2 order-1 mb-2 sm:mb-0">
              <div className="relative flex-1 sm:flex-none w-full sm:w-40 md:w-48 lg:w-64">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 sm:h-9 md:h-10 text-xs sm:text-sm w-full"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortConfig(null)}
                className="whitespace-nowrap text-xs sm:text-sm h-8 sm:h-9 md:h-10 px-2 sm:px-3 md:px-4"
              >
                Reset
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center justify-start sm:justify-end gap-3 sm:gap-4 md:gap-5 order-2 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 rounded-full bg-emerald-500" />
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Above 75%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 rounded-full bg-red-500" />
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Below 75%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full mt-3 sm:mt-4 md:mt-5 overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        <div className="min-w-full inline-block align-middle">
          <div className="overflow-hidden">
            <Table className="min-w-full divide-y divide-border">
              <TableHeader>
                <TableRow className="hover:bg-muted/50">
                  <TableHead className="w-10 sm:w-12 md:w-14 lg:w-16 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm">
                    S.No
                  </TableHead>
                  <TableHead className="py-2 sm:py-2.5 md:py-3">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("name")}
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-1 h-auto"
                    >
                      Name
                      <ArrowUpDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="py-2 sm:py-2.5 md:py-3 hidden sm:table-cell">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("username")}
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-1 h-auto"
                    >
                      Roll Number
                      <ArrowUpDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="py-2 sm:py-2.5 md:py-3">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("percentage")}
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-1 h-auto"
                    >
                      <span className="whitespace-nowrap">Attendance %</span>
                      <ArrowUpDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm whitespace-nowrap">
                    Classes Attended
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 sm:py-12 md:py-16 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-muted-foreground/60"
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
                        <p className="text-sm sm:text-base">No attendance data available</p>
                        <p className="text-xs sm:text-sm text-muted-foreground/80">
                          Student attendance records will appear here when available
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.map((item: StudentAttendance, index: number) => (
                    <TableRow key={item.username} className="hover:bg-muted/50">
                      <TableCell className="py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-medium">
                        {index + 1}
                      </TableCell>
                      <TableCell className="py-2 sm:py-2.5 md:py-3">
                        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                          <div className="relative h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 flex-shrink-0 overflow-hidden rounded-full">
                            <Image
                              src={item.image || "https://i.postimg.cc/zXj77wQG/image.png"}
                              fill
                              sizes="(max-width: 640px) 24px, (max-width: 768px) 32px, 40px"
                              alt={`${item.name}'s profile image`}
                              className="object-cover"
                            />
                          </div>
                          <span className="text-xs sm:text-sm md:text-base font-medium">
                            {item.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm hidden sm:table-cell">
                        {item.username}
                      </TableCell>
                      <TableCell className="py-2 sm:py-2.5 md:py-3">
                        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                          <div
                            className={cn(
                              "h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 rounded-full",
                              item.percentage < 75 
                                ? "bg-red-500" 
                                : "bg-emerald-500"
                            )}
                          />
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 sm:px-2 sm:py-0.5 md:px-2.5 md:py-1 text-xs font-medium",
                              item.percentage < 75
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {Math.round(item.percentage)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm whitespace-nowrap font-medium">
                        <span className={cn(
                          item.classesAttended / item.totalClasses < 0.75
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}>
                          {item.classesAttended || 0}
                        </span>
                        <span className="mx-0.5 text-muted-foreground">/</span>
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
        <div className="mt-3 sm:mt-4 md:mt-5 text-xs sm:text-sm text-muted-foreground flex justify-between items-center flex-wrap gap-2">
          <span>Showing {sortedData.length} {sortedData.length === 1 ? "student" : "students"}</span>
          <span className="text-xs">
            {sortedData.filter(s => s.percentage >= 75).length} students with attendance ≥75%
          </span>
        </div>
      )}
    </div>
  );
};

export default OverallAttendanceTable;
