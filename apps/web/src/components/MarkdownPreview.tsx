import { marked } from "marked";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

marked.use({
  breaks: true,
  extensions: [
    {
      name: "image",
      level: "inline",
      tokenizer(src) {
        const match = /^!\[(.*?)\]\((.*?)(?:\s+\{(\d+)x(\d+)\})?\)/.exec(src);
        if (match) {
          return {
            type: "image",
            raw: match[0],
            text: match[1],
            href: match[2],
            width: match[3],
            height: match[4],
          };
        }
        return undefined;
      },
      renderer(token) {
        const { href, text, width, height } = token;
        return `<img src="${href}" alt="${text}" ${width ? `width="${width}"` : ""} ${height ? `height="${height}"` : ""} style="max-width: 100%; height: auto;" />`;
      },
    },
  ],
});

marked.use({
  renderer: {
    heading(token) {
      const { text, depth } = token;
      const styles = {
        1: "text-4xl font-bold mb-3",
        2: "text-3xl font-semibold mb-2",
      };
      return `<h${depth} class="${styles[depth as keyof typeof styles] || ""}">${text}</h${depth}>`;
    },
    list(token) {
      const { items, ordered } = token;
      const type = ordered ? "ol" : "ul";
      const style = ordered
        ? "list-decimal list-inside mb-4"
        : "list-disc list-inside mb-4";
      return `<${type} class="${style}">${items.map((item) => `<li class="ml-1">${item.text}</li>`).join("")}</${type}>`;
    },
    listitem(token) {
      return `<li class="ml-1">${token.text}</li>`;
    },
    blockquote(token) {
      return `<blockquote class="border-l-4 border-gray-300 pl-4 py-2 my-4 italic">${token.text}</blockquote>`;
    },
    strong(token) {
      return `<strong class="font-bold">${token.text}</strong>`;
    },
    em(token) {
      return `<em class="italic">${token.text}</em>`;
    },
    del(token) {
      return `<del class="line-through">${token.text}</del>`;
    },
    text(token) {
      return token.text;
    },
  },
});

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

const MarkdownPreview = ({ content, className }: MarkdownPreviewProps) => {
  const [html, setHtml] = useState("");

  useEffect(() => {
    const renderMarkdown = async () => {
      const renderedHtml = await marked(content || "", { async: true });
      setHtml(renderedHtml);
    };

    void renderMarkdown();
  }, [content]);

  return (
    <div
      className={cn("prose dark:prose-invert w-full max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownPreview;
