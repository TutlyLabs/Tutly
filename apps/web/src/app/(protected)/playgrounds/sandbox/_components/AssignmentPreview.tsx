"use client";

import type { Attachment } from "@/lib/prisma";
import { Calendar, RefreshCw } from "lucide-react";

import MarkdownPreview from "@/components/MarkdownPreview";
import { Badge } from "@/components/ui/badge";
import day from "@/lib/dayjs";

interface AssignmentPreviewProps {
  assignment: Attachment;
}

export function AssignmentPreview({ assignment }: AssignmentPreviewProps) {
  return (
    <div
      className="flex h-full w-full flex-col rounded-l-xl shadow-2xl backdrop-blur-xl"
      style={{
        background:
          "linear-gradient(180deg, rgba(15, 15, 15, 1) 0%, rgba(35, 35, 35, 1) 10%, rgba(25, 25, 25, 1) 50%, rgba(20, 20, 20, 1) 100%)",
        borderColor: "rgba(100, 100, 100, 0.2)",
      }}
    >
      {/* Header */}
      <div
        className="flex h-[43px] flex-shrink-0 items-center justify-between border-b px-4 py-2 backdrop-blur-xl"
        style={{
          borderColor: "rgba(60, 60, 60, 0.18)",
          background:
            "linear-gradient(to right, rgba(20,20,20,0.95) 0%, rgba(25,25,25,0.98) 40%, rgba(10,10,10,1) 100%)",
        }}
      >
        <div
          className="flex items-center text-lg font-semibold"
          style={{ color: "#ffffff" }}
        >
          <span
            className="mr-2 h-2 w-2 rounded-full"
            style={{
              backgroundColor: "#10b981",
              boxShadow: "0 0 4px rgba(16, 185, 129, 0.5)",
            }}
          ></span>
          {assignment.title}
        </div>

        {/* Compact chips */}
        <div className="flex items-center gap-2">
          {assignment.dueDate && (
            <Badge
              variant="secondary"
              className="border-blue-700/50 bg-blue-900/50 px-2 py-1 text-xs text-blue-200"
            >
              <Calendar className="mr-1 h-3 w-3" />
              {day(assignment.dueDate).format("DD MMM YYYY")}
            </Badge>
          )}
          <Badge
            variant="secondary"
            className="border-green-700/50 bg-green-900/50 px-2 py-1 text-xs text-green-200"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            {assignment.maxSubmissions} max submission
          </Badge>
        </div>
      </div>

      {/* Assignment Details */}
      <div className="flex-1 overflow-y-auto p-1">
        <div
          className="h-full rounded-lg border p-4"
          style={{
            background: "rgba(0, 0, 0, 0.3)",
            borderColor: "rgba(100, 100, 100, 0.2)",
          }}
        >
          {assignment.details ? (
            <MarkdownPreview
              content={assignment.details}
              className="text-white"
              fontSize="text-sm"
            />
          ) : (
            <div className="py-8 text-center text-gray-400">
              No assignment details provided
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
