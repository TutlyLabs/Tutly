import React from "react";
import MDEditor from "@uiw/react-md-editor";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = "" }: MarkdownPreviewProps) {
  const preprocessMarkdown = (markdown: string) => {
    return markdown.replace(
      /!\[(.*?)\]\((.*?)\s+\{(\d+)x(\d+)\}\)/g,
      (_match, alt, url, width, height) => {
        return `<div><img src="${url}" alt="${alt}" width="${width}" height="${height}" style="max-width: 100%; height: auto;" /></div>`;
      },
    );
  };

  const processedContent = preprocessMarkdown(content || "");

  return (
    <div className={className}>
      <MDEditor.Markdown
        source={processedContent}
        style={{
          backgroundColor: "transparent",
          color: "inherit",
        }}
        data-color-mode="dark"
      />
      <style dangerouslySetInnerHTML={{
        __html: `
          .wmde-markdown a[aria-hidden="true"],
          .wmde-markdown .anchor,
          .wmde-markdown h1:hover .anchor,
          .wmde-markdown h2:hover .anchor,
          .wmde-markdown h3:hover .anchor,
          .wmde-markdown h4:hover .anchor,
          .wmde-markdown h5:hover .anchor,
          .wmde-markdown h6:hover .anchor {
            display: none !important;
          }
          
          .wmde-markdown table {
            background-color: transparent !important;
            border-collapse: collapse !important;
            margin: 0.5rem 0 !important;
            border-radius: 0.5rem !important;
            overflow: hidden !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
          }
          .wmde-markdown table th,
          .wmde-markdown table td {
            background-color: transparent !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            padding: 0.5rem !important;
          }
          .wmde-markdown table th {
            font-weight: 600 !important;
            background-color: rgba(255, 255, 255, 0.05) !important;
          }
          .wmde-markdown table tr:nth-child(even) {
            background-color: rgba(255, 255, 255, 0.02) !important;
          }
          .wmde-markdown table tr:hover {
            background-color: rgba(255, 255, 255, 0.05) !important;
          }
        `
      }} />
    </div>
  );
}
