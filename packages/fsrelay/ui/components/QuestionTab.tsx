import React from "react";
import { MarkdownPreview } from "./MarkdownPreview";
import { generateAssignmentHtml } from "../../src/utils/tiptap";

interface Assignment {
  id: string;
  title: string;
  details: string;
  detailsJson?: any;
}

interface QuestionTabProps {
  assignment: Assignment;
}

export function QuestionTab({ assignment }: QuestionTabProps) {
  return (
    <div className="h-full overflow-auto bg-[#1e1e1e]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#cccccc] mb-3 leading-tight">
            {assignment.title}
          </h1>
          <div className="h-1 w-16 bg-blue-500 rounded-full"></div>
        </div>

        {/* Assignment Details */}
        <div className="prose prose-invert prose-sm max-w-none">
          {assignment.detailsJson ? (
            <div
              className="text-[#cccccc] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: generateAssignmentHtml(assignment.detailsJson) }}
            />
          ) : assignment.details ? (
            <div className="text-[#cccccc]">
              <MarkdownPreview content={assignment.details} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-[#252526] rounded-lg border border-[#3e3e3e]">
              <svg className="w-16 h-16 text-[#858585] mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-[#858585]">No assignment details available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
