"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FaCheckCircle, FaTimesCircle, FaClock } from "react-icons/fa";

interface StudentAttendanceIndicatorProps {
  courseId: string;
  attendance?: {
    username: string;
    attended: boolean;
    attendedDuration: number | null;
    user?: {
      name: string;
      image?: string | null;
      email?: string | null;
    };
  };
  attendanceUploaded: boolean;
}

export default function StudentAttendanceIndicator({
  courseId,
  attendance,
  attendanceUploaded,
}: StudentAttendanceIndicatorProps) {
  // If attendance has been uploaded
  if (attendanceUploaded) {
    // Check if student's record exists
    if (attendance) {
      // Student is present
      if (attendance.attended) {
        return (
          <Link
            href={`/statistics/${courseId}`}
            target="_blank"
            className="flex items-center gap-2"
          >
            <Badge
              variant="outline"
              className="flex cursor-pointer items-center gap-1.5 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
            >
              <FaCheckCircle className="h-3 w-3" />
              <span className="text-xs font-medium">
                {attendance.attendedDuration
                  ? `Present (${attendance.attendedDuration}m)`
                  : "Present"}
              </span>
            </Badge>
          </Link>
        );
      }
      // Student is absent (record exists but attended is false)
      return (
        <Link
          href={`/statistics/${courseId}`}
          target="_blank"
          className="flex items-center gap-2"
        >
          <Badge
            variant="outline"
            className="flex cursor-pointer items-center gap-1.5 bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-400"
          >
            <FaTimesCircle className="h-3 w-3" />
            <span className="text-xs font-medium">
              {attendance.attendedDuration
                ? `Absent (${attendance.attendedDuration}m)`
                : "Absent"}
            </span>
          </Badge>
        </Link>
      );
    }
    // Attendance uploaded but no record for this student - means absent
    return (
      <Link
        href={`/statistics/${courseId}`}
        target="_blank"
        className="flex items-center gap-2"
      >
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-400"
        >
          <FaTimesCircle className="h-3 w-3" />
          <span className="text-xs font-medium">Absent</span>
        </Badge>
      </Link>
    );
  }

  // Attendance not yet uploaded
  return (
    <Link
      href={`/statistics/${courseId}`}
      target="_blank"
      className="flex items-center gap-2"
    >
      <Badge
        variant="outline"
        className="flex items-center gap-1.5 bg-gray-500/10 text-gray-700 hover:bg-gray-500/20 dark:text-gray-400"
      >
        <FaClock className="h-3 w-3" />
        <span className="text-xs font-medium">Not Marked Yet</span>
      </Badge>
    </Link>
  );
}
