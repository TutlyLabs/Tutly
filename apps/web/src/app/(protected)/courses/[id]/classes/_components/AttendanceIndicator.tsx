"use client";

import { useState, useMemo, useRef } from "react";
import {
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaUpload,
  FaSearch,
  FaClock,
  FaMinus,
  FaMinusCircle,
} from "react-icons/fa";
import { ArrowUpDown } from "lucide-react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

interface NotAttendedStudent {
  username: string;
  user: {
    name: string;
    image: string | null;
    email: string | null;
    enrolledUsers: {
      mentorUsername: string | null;
    }[];
  };
}

interface AttendanceIndicatorProps {
  classId: string;
  attendance?: AttendanceData[];
  present?: number;
  role: string;
  courseId: string;
  totalEnrolledStudents?: number;
  notAttendedStudents?: NotAttendedStudent[];
}

export default function AttendanceIndicator({
  classId,
  attendance = [],
  present = 0,
  role,
  courseId,
  totalEnrolledStudents = 0,
  notAttendedStudents = [],
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

  // Calculate percentages based on total enrolled students
  const attendedCount = attendance.length; // Total students who were recorded (attended + absent with some duration + no attendance)
  const presentPercentage =
    attendedCount > 0 ? Math.round((present / attendedCount) * 100) : 0;
  const attendedPercentage =
    totalEnrolledStudents > 0
      ? Math.round((attendedCount / totalEnrolledStudents) * 100)
      : 0;

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

  // Filter not attended students (those without attendance records)
  const filterNotAttendedStudents = (students: NotAttendedStudent[]) => {
    if (!debouncedSearchQuery.trim()) return students;
    const query = debouncedSearchQuery.toLowerCase();
    return students.filter(
      (student) =>
        student.user.name.toLowerCase().includes(query) ||
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

  const filteredAllStudents = useMemo(() => {
    const attendedStudents = sortStudents(filterStudents(attendance));
    const notAttended = filterNotAttendedStudents(notAttendedStudents);
    return { attendedStudents, notAttended };
  }, [attendance, notAttendedStudents, debouncedSearchQuery, sortBy]);

  const filteredPresentAndBelowStudents = useMemo(() => {
    const present = sortStudents(
      filterStudents(attendance.filter((a) => a.attended)),
    );
    const belowCriteria = sortStudents(
      filterStudents(
        attendance.filter(
          (a) => !a.attended && a.attendedDuration && a.attendedDuration > 0,
        ),
      ),
    );
    return { present, belowCriteria };
  }, [attendance, debouncedSearchQuery, sortBy]);

  const filteredBelowCriteriaStudents = useMemo(
    () =>
      sortStudents(
        filterStudents(
          attendance.filter(
            (a) => !a.attended && a.attendedDuration && a.attendedDuration > 0,
          ),
        ),
      ),
    [attendance, debouncedSearchQuery, sortBy],
  );
  const filteredNotAttendedStudents = useMemo(
    () => filterNotAttendedStudents(notAttendedStudents),
    [notAttendedStudents, debouncedSearchQuery],
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

  // No attendance data yet - don't render anything (handled in Class.tsx now)
  if (attendance.length === 0) {
    return null;
  }

  const presentStudents = attendance.filter((a) => a.attended);
  const absentStudents = attendance.filter((a) => !a.attended);
  const absentWithNoRecordStudents = absentStudents.filter(
    (a) => !a.attendedDuration || a.attendedDuration === 0,
  );
  const attendedButBelowCriteria = absentStudents.filter(
    (a) => a.attendedDuration && a.attendedDuration > 0,
  );

  // Calculate percentages for each category
  const belowCriteriaPercentage =
    attendedCount > 0
      ? Math.round((attendedButBelowCriteria.length / attendedCount) * 100)
      : 0;
  const notAttendedPercentage =
    totalEnrolledStudents > 0
      ? Math.round((notAttendedStudents.length / totalEnrolledStudents) * 100)
      : 0;

  // Student card component
  const StudentCard = ({
    student,
    showDuration = true,
    showStatus = false,
    variant = "default",
  }: {
    student: AttendanceData | NotAttendedStudent;
    showDuration?: boolean;
    showStatus?: boolean;
    variant?: "default" | "orange" | "red";
  }) => {
    const isAttendanceData = "attended" in student;
    const mentorUsername = student.user?.enrolledUsers?.[0]?.mentorUsername;

    const getBackgroundColor = () => {
      if (variant === "orange") return "bg-orange-500/5";
      if (variant === "red") return "bg-red-500/5";
      if (showStatus && isAttendanceData) {
        if (student.attended) {
          return "bg-emerald-500/5";
        } else if (student.attendedDuration && student.attendedDuration > 0) {
          return "bg-orange-500/5"; // Has duration but didn't meet criteria
        } else {
          return "bg-red-500/5"; // No duration at all
        }
      }
      if (isAttendanceData) {
        return student.attended ? "bg-emerald-500/5" : "bg-red-500/5";
      }
      return "bg-red-500/5"; // Not attended students
    };

    return (
      <Link
        href={`/profile/${student.username}`}
        target="_blank"
        className={`hover:bg-accent flex items-center gap-3 rounded-lg border p-2 transition-colors ${getBackgroundColor()}`}
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
        <div className="max-w-[320px] flex-1">
          <p className="truncate text-sm font-medium">
            {student.user?.name || student.username}
          </p>
          <div className="flex gap-2">
            <p className="text-muted-foreground truncate text-xs leading-tight">
              @{student.username}
            </p>
            {mentorUsername && (
              <p className="text-muted-foreground truncate text-xs leading-tight">
                | Mentor: @{mentorUsername}
              </p>
            )}
          </div>
        </div>
        <div className="mr-2 ml-auto flex flex-shrink-0 items-center gap-2">
          {showDuration && isAttendanceData && student.attendedDuration && (
            <Badge variant="outline" className="text-xs">
              {student.attendedDuration}m
            </Badge>
          )}
          {showStatus && isAttendanceData ? (
            student.attended ? (
              <FaCheckCircle className="h-4 w-4 text-emerald-600" />
            ) : student.attendedDuration && student.attendedDuration > 0 ? (
              <FaMinusCircle className="h-4 w-4 text-orange-600" />
            ) : (
              <FaTimesCircle className="h-4 w-4 text-red-600" />
            )
          ) : variant === "orange" ? (
            <FaMinusCircle className="h-4 w-4 text-orange-600" />
          ) : variant === "red" ? (
            <FaTimesCircle className="h-4 w-4 text-red-600" />
          ) : null}
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="flex items-center gap-2 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-400"
                >
                  <FaUsers className="h-3 w-3" />
                  <span className="text-[10px] font-medium">
                    {attendedCount}/{totalEnrolledStudents} Attended (
                    {attendedPercentage}%)
                  </span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Students who attended (with any duration) out of total
                  enrolled students
                </p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                >
                  <FaCheckCircle className="h-3 w-3" />
                  <span className="text-[10px] font-medium">
                    {present}/{attendedCount} Present ({presentPercentage}%)
                  </span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Students who met the minimum attendance criteria out of those
                  who attended
                </p>
              </TooltipContent>
            </Tooltip>

            {attendedButBelowCriteria.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1.5 bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 dark:text-orange-400"
                  >
                    <FaMinusCircle className="h-3 w-3" />
                    <span className="text-[10px] font-medium">
                      {attendedButBelowCriteria.length}/{attendedCount} Below
                      Criteria ({belowCriteriaPercentage}%)
                    </span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Students who attended but didn't meet the minimum duration
                    criteria
                  </p>
                </TooltipContent>
              </Tooltip>
            )}

            {notAttendedStudents.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1.5 bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-400"
                  >
                    <FaTimesCircle className="h-3 w-3" />
                    <span className="text-[10px] font-medium">
                      {notAttendedStudents.length}/{totalEnrolledStudents} Not
                      Attended ({notAttendedPercentage}%)
                    </span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Enrolled students who didn't attend the class at all
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[550px] p-0"
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
                {attendedCount}/{totalEnrolledStudents} Attended (
                {attendedPercentage}%)
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
                <SelectTrigger className="h-9 w-[180px] text-xs">
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

            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="text-xs">
                All (
                {filteredAllStudents.attendedStudents.length +
                  filteredAllStudents.notAttended.length}
                )
              </TabsTrigger>
              <TabsTrigger value="present" className="text-xs">
                Attended (
                {filteredPresentAndBelowStudents.present.length +
                  filteredPresentAndBelowStudents.belowCriteria.length}
                )
              </TabsTrigger>
              <TabsTrigger value="below-criteria" className="text-xs">
                Below Criteria ({filteredBelowCriteriaStudents.length})
              </TabsTrigger>
              <TabsTrigger value="not-attended" className="text-xs">
                Not Attended ({filteredNotAttendedStudents.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <Separator />

          <ScrollArea className="h-[400px]">
            <TabsContent value="all" className="mt-0 p-4">
              {filteredAllStudents.attendedStudents.length > 0 ||
              filteredAllStudents.notAttended.length > 0 ? (
                <div className="space-y-2">
                  {filteredAllStudents.attendedStudents.map((student, idx) => (
                    <StudentCard
                      key={`attended-${idx}`}
                      student={student}
                      showStatus
                    />
                  ))}
                  {filteredAllStudents.notAttended.map((student, idx) => (
                    <StudentCard
                      key={`not-attended-${idx}`}
                      student={student}
                      showStatus
                      variant="red"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center text-sm">
                  {searchQuery ? "No students found" : "No attendance data"}
                </p>
              )}
            </TabsContent>
            <TabsContent value="present" className="mt-0 p-4">
              {filteredPresentAndBelowStudents.present.length > 0 ||
              filteredPresentAndBelowStudents.belowCriteria.length > 0 ? (
                <div className="space-y-2">
                  {filteredPresentAndBelowStudents.present.map(
                    (student, idx) => (
                      <StudentCard
                        key={`present-${idx}`}
                        student={student}
                        showDuration
                        showStatus
                      />
                    ),
                  )}
                  {filteredPresentAndBelowStudents.belowCriteria.map(
                    (student, idx) => (
                      <StudentCard
                        key={`below-${idx}`}
                        student={student}
                        showDuration
                        showStatus
                      />
                    ),
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center text-sm">
                  {searchQuery ? "No students found" : "No students present"}
                </p>
              )}
            </TabsContent>{" "}
            <TabsContent value="below-criteria" className="mt-0 p-4">
              {filteredBelowCriteriaStudents.length > 0 ? (
                <div className="space-y-2">
                  {filteredBelowCriteriaStudents.map((student, idx) => (
                    <StudentCard
                      key={idx}
                      student={student}
                      showDuration={true}
                      variant="orange"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center text-sm">
                  {searchQuery
                    ? "No students found"
                    : "No students below attendance criteria"}
                </p>
              )}
            </TabsContent>
            <TabsContent value="not-attended" className="mt-0 p-4">
              {filteredNotAttendedStudents.length > 0 ? (
                <div className="space-y-2">
                  {filteredNotAttendedStudents.map((student, idx) => (
                    <StudentCard
                      key={idx}
                      student={student}
                      showDuration={false}
                      variant="red"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center text-sm">
                  {searchQuery
                    ? "No students found"
                    : "All students attended for some duration"}
                </p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
