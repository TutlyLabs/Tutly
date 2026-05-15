"use client";

import type { Attachment } from "@tutly/db/browser";
import { Calendar, RefreshCw } from "lucide-react";

import ContentPreview from "@/components/ContentPreview";
import { Badge } from "@tutly/ui/badge";
import day from "@tutly/utils/dayjs";

interface AssignmentPreviewProps {
  assignment: Attachment;
}

function hasJsonContent(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const content = (json as any).content;
  return Array.isArray(content) && content.length > 0;
}

export function AssignmentPreview({ assignment }: AssignmentPreviewProps) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          Assignment
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {assignment.dueDate && (
            <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px]">
              <Calendar className="h-3 w-3" />
              {day(assignment.dueDate).format("DD MMM")}
            </Badge>
          )}
          <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px]">
            <RefreshCw className="h-3 w-3" />
            {assignment.maxSubmissions} max
          </Badge>
        </div>
      </div>
      <div className="border-b px-3 py-2.5">
        <div className="text-foreground line-clamp-2 text-sm font-semibold">
          {assignment.title}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {assignment.details || hasJsonContent(assignment.detailsJson) ? (
          <ContentPreview
            content={assignment.details ?? ""}
            jsonContent={assignment.detailsJson}
            fontSize="text-xs"
          />
        ) : (
          <div className="text-muted-foreground py-8 text-center text-xs">
            No assignment details provided
          </div>
        )}
      </div>
    </div>
  );
}
