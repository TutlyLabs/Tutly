"use client"

import MarkdownPreview from "./MarkdownPreview";
import RichTextEditor from "./editor/RichTextEditor";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";

interface ContentPreviewProps {
  content: string;
  jsonContent?: any;
  className?: string;
  hideAnchors?: boolean;
  fontSize?: "text-xs" | "text-sm" | "text-base" | "text-lg" | "text-xl";
}

const ContentPreview = ({
  content,
  jsonContent,
  className,
  hideAnchors = true,
  fontSize,
}: ContentPreviewProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (jsonContent && jsonContent !== null && typeof jsonContent === 'object') {
    if (!mounted) {
      return (
        <div className={cn("w-full", className)}>
          <div className="min-h-[150px] flex items-center justify-center rounded-md border-2 border-dashed border-primary/20 bg-primary/5">
            <div className="flex flex-col items-center gap-3 text-primary">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
              <span className="text-sm font-medium">Loading content...</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={cn("w-full")}>
        <RichTextEditor
          initialValue={jsonContent}
          onChange={() => { }}
          readonly={true}
          height="auto"
        />
      </div>
    );
  }

  return (
    <MarkdownPreview
      content={content}
      className={className}
      hideAnchors={hideAnchors}
      fontSize={fontSize}
    />
  );
};

export default ContentPreview;