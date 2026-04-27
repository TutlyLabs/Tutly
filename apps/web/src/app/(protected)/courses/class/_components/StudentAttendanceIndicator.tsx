"use client";

import Link from "next/link";
import { Badge } from "@tutly/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tutly/ui/tooltip";
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

function StatusChip({
  href,
  icon,
  label,
  tone,
  tooltip,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  tone: "emerald" | "rose" | "muted";
  tooltip?: string;
}) {
  const toneClasses: Record<typeof tone, string> = {
    emerald:
      "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400",
    rose: "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-400",
    muted:
      "bg-muted/60 text-muted-foreground hover:bg-muted",
  };
  const chip = (
    <Link
      href={href}
      target="_blank"
      className="inline-flex items-center"
      aria-label={label}
      title={label}
    >
      <Badge
        variant="outline"
        className={`flex h-7 cursor-pointer items-center gap-1.5 ${toneClasses[tone]}`}
      >
        {icon}
        {/* Full label desktop, icon-only mobile */}
        <span className="hidden text-xs font-medium sm:inline">{label}</span>
      </Badge>
    </Link>
  );
  if (!tooltip) return chip;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{chip}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function StudentAttendanceIndicator({
  courseId,
  attendance,
  attendanceUploaded,
}: StudentAttendanceIndicatorProps) {
  const href = `/statistics/detail?id=${courseId}`;

  if (!attendanceUploaded) {
    return (
      <StatusChip
        href={href}
        tone="muted"
        icon={<FaClock className="h-3 w-3" />}
        label="Not Marked Yet"
      />
    );
  }

  if (attendance?.attended) {
    return (
      <StatusChip
        href={href}
        tone="emerald"
        icon={<FaCheckCircle className="h-3 w-3" />}
        label={
          attendance.attendedDuration
            ? `Present (${attendance.attendedDuration}m)`
            : "Present"
        }
      />
    );
  }

  // Absent (record exists but not attended, OR no record)
  const label = attendance?.attendedDuration
    ? `Absent (${attendance.attendedDuration}m)`
    : "Absent";
  return (
    <StatusChip
      href={href}
      tone="rose"
      icon={<FaTimesCircle className="h-3 w-3" />}
      label={label}
      tooltip={
        attendance?.attendedDuration
          ? "Below minimum attendance criteria set by instructor"
          : undefined
      }
    />
  );
}
