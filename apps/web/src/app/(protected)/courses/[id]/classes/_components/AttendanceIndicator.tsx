"use client";

import { useState, useMemo, useRef } from "react";
import {
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaUpload,
  FaSearch,
} from "react-icons/fa";
import { ArrowUpDown } from "lucide-react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AttendanceData {
  username: string;
  attended: boolean;
  attendedDuration: number | null;
  user?: {
    name: string;
    image?: string | null;
    email?: string | null;
    enrolledUsers?: {
      mentorUsername: string | null;
    }[];
  };
  data?: any[];
}

interface AttendanceIndicatorProps {
  classId: string;
  attendance?: AttendanceData[];
  present?: number;
  role: string;
  courseId: string;
}

export default function AttendanceIndicator({
  classId,
  attendance = [],
  present = 0,
  role,
  courseId,
}: AttendanceIndicatorProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "duration" | "name" | "username" | "mentor"
  >("duration");
  const debouncedSearchQuery = useDebounce(searchQuery, 200);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const total = attendance.length;
  const absent = total - present;

  // Filter students based on debounced search query
  const filterStudents = (students: AttendanceData[]) => {
    if (!debouncedSearchQuery.trim()) return students;
    const query = debouncedSearchQuery.toLowerCase();
    return students.filter(
      (student) =>
        student.user?.name?.toLowerCase().includes(query) ||
        student.username.toLowerCase().includes(query),
    );
  };

  // Sort students based on selected sort option
  const sortStudents = (students: AttendanceData[]) => {
    return [...students].sort((a, b) => {
      switch (sortBy) {
        case "duration": {
          // Sort by attended duration (descending), nulls last
          const durationA = a.attendedDuration ?? -1;
          const durationB = b.attendedDuration ?? -1;
          return durationB - durationA;
        }
        case "name": {
          const nameA = (a.user?.name || a.username).toLowerCase();
          const nameB = (b.user?.name || b.username).toLowerCase();
          return nameA.localeCompare(nameB);
        }
        case "username":
          return a.username
            .toLowerCase()
            .localeCompare(b.username.toLowerCase());
        case "mentor": {
          const mentorA = (
            a.user?.enrolledUsers?.[0]?.mentorUsername || ""
          ).toLowerCase();
          const mentorB = (
            b.user?.enrolledUsers?.[0]?.mentorUsername || ""
          ).toLowerCase();
          return mentorA.localeCompare(mentorB);
        }
        default:
          return 0;
      }
    });
  };

  const filteredAttendance = useMemo(
    () => sortStudents(filterStudents(attendance)),
    [attendance, debouncedSearchQuery, sortBy],
  );
  const filteredPresentStudents = useMemo(
    () => sortStudents(filterStudents(attendance.filter((a) => a.attended))),
    [attendance, debouncedSearchQuery, sortBy],
  );
  const filteredAbsentStudents = useMemo(
    () => sortStudents(filterStudents(attendance.filter((a) => !a.attended))),
    [attendance, debouncedSearchQuery, sortBy],
  );

  // Improved hover handlers with delay
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsPopoverOpen(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsPopoverOpen(false);
    }, 300);
  };

  const cancelClose = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  // No attendance data yet - show upload button
  if (attendance.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href={`/tutor/attendance?courseId=${courseId}&classId=${classId}`}
          target="_blank"
        >
          <Button
            variant="outline"
            size="sm"
            className="flex cursor-pointer items-center gap-2 hover:bg-blue-500/10"
          >
            <FaUpload className="h-3.5 w-3.5" />
            <span className="text-xs">Upload Attendance</span>
          </Button>
        </Link>
      </div>
    );
  }

  const presentStudents = attendance.filter((a) => a.attended);
  const absentStudents = attendance.filter((a) => !a.attended);
  const attendancePercentage =
    total > 0 ? Math.round((present / total) * 100) : 0;

  // Student card component
  const StudentCard = ({
    student,
    showDuration = true,
    showStatus = false,
  }: {
    student: AttendanceData;
    showDuration?: boolean;
    showStatus?: boolean;
  }) => {
    const mentorUsername = student.user?.enrolledUsers?.[0]?.mentorUsername;

    return (
      <Link
        href={`/profile/${student.username}`}
        target="_blank"
        className={`hover:bg-accent flex items-center gap-3 rounded-lg border p-2 transition-colors ${
          showStatus
            ? student.attended
              ? "bg-emerald-500/5"
              : "bg-red-500/5"
            : student.attended
              ? "bg-emerald-500/5"
              : "bg-red-500/5"
        }`}
      >
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={student.user?.image || ""} />
          <AvatarFallback className="text-xs">
            {(student.user?.name || student.username)
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="max-w-[200px] flex-1">
          <p className="truncate text-sm font-medium">
            {student.user?.name || student.username}
          </p>
          <p className="text-muted-foreground truncate text-[10px] leading-tight">
            @{student.username}
          </p>
          {mentorUsername && (
            <p className="text-muted-foreground truncate text-[10px] leading-tight">
              Mentor: @{mentorUsername}
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {showDuration && student.attendedDuration && (
            <Badge variant="outline" className="text-xs">
              {student.attendedDuration}m
            </Badge>
          )}
          {showStatus &&
            (student.attended ? (
              <FaCheckCircle className="h-4 w-4 text-emerald-600" />
            ) : (
              <FaTimesCircle className="h-4 w-4 text-red-600" />
            ))}
        </div>
      </Link>
    );
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <div
          className="flex cursor-pointer items-center gap-2"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Badge
            variant="outline"
            className="flex items-center gap-2 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-400"
          >
            <FaUsers className="h-3 w-3" />
            <span className="text-xs font-medium">{total} Students</span>
          </Badge>
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
          >
            <FaCheckCircle className="h-3 w-3" />
            <span className="text-xs font-medium">
              {present} Present ({attendancePercentage}%)
            </span>
          </Badge>
          {absent > 0 && (
            <Badge
              variant="outline"
              className="flex items-center gap-1.5 bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-400"
            >
              <FaTimesCircle className="h-3 w-3" />
              <span className="text-xs font-medium">{absent} Absent</span>
            </Badge>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="start"
        onMouseEnter={cancelClose}
        onMouseLeave={handleMouseLeave}
      >
        <Tabs defaultValue="all" className="w-full">
          <div className="p-4 pb-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Class Attendance Details
              </h3>
              <Badge variant="secondary" className="text-xs">
                {present}/{total} ({attendancePercentage}%)
              </Badge>
            </div>

            {/* Search Input */}
            <div className="mb-3 flex items-center gap-2">
              <div className="relative flex-1">
                <FaSearch className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 text-sm"
                />
              </div>
              <Select
                value={sortBy}
                onValueChange={(value: any) => setSortBy(value)}
              >
                <SelectTrigger className="h-9 w-[120px] text-xs">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="username">Roll Number</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="text-xs">
                All ({filteredAttendance.length})
              </TabsTrigger>
              <TabsTrigger value="present" className="text-xs">
                Present ({filteredPresentStudents.length})
              </TabsTrigger>
              <TabsTrigger value="absent" className="text-xs">
                Absent ({filteredAbsentStudents.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <Separator />

          <ScrollArea className="h-[400px]">
            <TabsContent value="all" className="mt-0 p-4">
              {filteredAttendance.length > 0 ? (
                <div className="space-y-2">
                  {filteredAttendance.map((student, idx) => (
                    <StudentCard key={idx} student={student} showStatus />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center text-sm">
                  {searchQuery ? "No students found" : "No attendance data"}
                </p>
              )}
            </TabsContent>

            <TabsContent value="present" className="mt-0 p-4">
              {filteredPresentStudents.length > 0 ? (
                <div className="space-y-2">
                  {filteredPresentStudents.map((student, idx) => (
                    <StudentCard key={idx} student={student} showDuration />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center text-sm">
                  {searchQuery ? "No students found" : "No students present"}
                </p>
              )}
            </TabsContent>

            <TabsContent value="absent" className="mt-0 p-4">
              {filteredAbsentStudents.length > 0 ? (
                <div className="space-y-2">
                  {filteredAbsentStudents.map((student, idx) => (
                    <StudentCard
                      key={idx}
                      student={student}
                      showDuration={false}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center text-sm">
                  {searchQuery ? "No students found" : "No students absent"}
                </p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
