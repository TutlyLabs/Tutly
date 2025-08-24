import MDEditor from "@uiw/react-md-editor";

import { cn } from "@/lib/utils";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  hideAnchors?: boolean;
  fontSize?: "text-xs" | "text-sm" | "text-base" | "text-lg" | "text-xl";
}

const MarkdownPreview = ({
  content,
  className,
  hideAnchors = true,
  fontSize,
}: MarkdownPreviewProps) => {
  const preprocessMarkdown = (markdown: string) => {
    return markdown.replace(
      /!\[(.*?)\]\((.*?)\s+\{(\d+)x(\d+)\}\)/g,
      (_match, alt, url, width, height) => {
        return `<div><img src="${url}" alt="${alt}" width="${width}" height="${height}" style="max-width: 100%; height: auto;" /></div>`;
      },
    );
  };

  const processedContent = preprocessMarkdown(content || "");

  const getFontSizeStyles = () => {
    if (!fontSize) return "";

    const sizeMap = {
      "text-xs": {
        h1: "0.875rem",
        h2: "0.8rem",
        h3: "0.75rem",
        p: "0.75rem",
        all: "0.75rem",
      },
      "text-sm": {
        h1: "1rem",
        h2: "0.95rem",
        h3: "0.875rem",
        p: "0.875rem",
        all: "0.875rem",
      },
      "text-base": {
        h1: "1.125rem",
        h2: "1.1rem",
        h3: "1rem",
        p: "1rem",
        all: "1rem",
      },
      "text-lg": {
        h1: "1.25rem",
        h2: "1.2rem",
        h3: "1.125rem",
        p: "1.125rem",
        all: "1.125rem",
      },
      "text-xl": {
        h1: "1.5rem",
        h2: "1.4rem",
        h3: "1.25rem",
        p: "1.25rem",
        all: "1.25rem",
      },
    };

    const sizes = sizeMap[fontSize];
    return `
      .markdown-custom-size * {
        font-size: ${sizes.all} !important;
        line-height: 1.5 !important;
      }
      .markdown-custom-size h1 { font-size: ${sizes.h1} !important; font-weight: 600 !important; }
      .markdown-custom-size h2 { font-size: ${sizes.h2} !important; font-weight: 600 !important; }
      .markdown-custom-size h3 { font-size: ${sizes.h3} !important; font-weight: 500 !important; }
      .markdown-custom-size p { font-size: ${sizes.p} !important; }
      .markdown-custom-size li { font-size: ${sizes.p} !important; }
    `;
  };

  return (
    <div
      className={cn(
        "w-full",
        hideAnchors && "markdown-no-links",
        fontSize && "markdown-custom-size",
        className,
      )}
    >
      <MDEditor.Markdown
        source={processedContent}
        style={{
          backgroundColor: "transparent",
          color: "inherit",
        }}
        data-color-mode="dark"
      />
      {(hideAnchors || fontSize) && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
            ${
              hideAnchors
                ? `
              .markdown-no-links .wmde-markdown a[aria-hidden="true"],
              .markdown-no-links .wmde-markdown .anchor,
              .markdown-no-links .wmde-markdown h1:hover .anchor,
              .markdown-no-links .wmde-markdown h2:hover .anchor,
              .markdown-no-links .wmde-markdown h3:hover .anchor,
              .markdown-no-links .wmde-markdown h4:hover .anchor,
              .markdown-no-links .wmde-markdown h5:hover .anchor,
              .markdown-no-links .wmde-markdown h6:hover .anchor {
                display: none !important;
              }
            `
                : ""
            }
            ${fontSize ? getFontSizeStyles() : ""}
            
            /* Table styling with transparent background */
            .wmde-markdown table {
              background-color: transparent !important;
              border-collapse: collapse !important;
              margin: 0.5rem 0 !important;
              border-radius: 0.5rem !important;
              overflow: hidden !important;
              border: 1px solid hsl(var(--border)) !important;
            }
            .wmde-markdown table th,
            .wmde-markdown table td {
              background-color: transparent !important;
              border: 1px solid hsl(var(--border)) !important;
              padding: 0.5rem !important;
            }
            .wmde-markdown table th {
              font-weight: 600 !important;
              background-color: hsl(var(--muted) / 0.3) !important;
            }
            .wmde-markdown table tr:nth-child(even) {
              background-color: hsl(var(--muted) / 0.1) !important;
            }
            .wmde-markdown table tr:hover {
              background-color: hsl(var(--muted) / 0.2) !important;
            }
          `,
          }}
        />
      )}
    </div>
  );
};

export default MarkdownPreview;
