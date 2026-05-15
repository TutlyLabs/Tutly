"use client";

import type { Attachment } from "@tutly/db/browser";
import { Calendar, RefreshCw } from "lucide-react";

import MarkdownPreview from "@/components/MarkdownPreview";
import { Badge } from "@tutly/ui/badge";
import day from "@tutly/utils/dayjs";

interface AssignmentPreviewProps {
  assignment: Attachment;
}

export function AssignmentPreview({ assignment }: AssignmentPreviewProps) {
  return (
    <div className="bg-muted/30 flex h-full w-full flex-col border-r">
      <div className="flex h-11 flex-shrink-0 items-center justify-between border-b px-4">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          <span className="truncate">{assignment.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {assignment.dueDate && (
            <Badge variant="secondary" className="gap-1 text-[11px]">
              <Calendar className="h-3 w-3" />
              {day(assignment.dueDate).format("DD MMM YYYY")}
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1 text-[11px]">
            <RefreshCw className="h-3 w-3" />
            {assignment.maxSubmissions} max
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {assignment.details ? (
          <MarkdownPreview content={assignment.details} fontSize="text-sm" />
        ) : (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No assignment details provided
          </div>
        )}
      </div>
    </div>
  );
}
