import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
  type Transformer,
} from "@lexical/markdown";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { type FileType } from "@tutly/api/schema";
import { $createTextNode, type LexicalNode, type TextNode } from "lexical";

import { cn } from "@/lib/utils";

import { EditorErrorBoundary } from "./ErrorBoundary";
import { $createImageNode, ImageNode } from "./nodes/ImageNode";
import { CheckListPlugin } from "./plugins/CheckListPlugin";
import ImagesPlugin from "./plugins/ImagePlugin";
import ListMaxIndentLevelPlugin from "./plugins/ListMaxIndentLevelPlugin";
import ToolbarPlugin from "./plugins/ToolbarPlugin";

const Placeholder = () => {
  return (
    <div className="text-muted-foreground absolute top-3 left-3">
      Enter some text...
    </div>
  );
};

export interface FileUploadOptions {
  fileType?: FileType;
  onUpload?: (file: any) => Promise<void>;
  associatingId?: string;
  allowedExtensions?: string[];
}

interface RichTextEditorProps {
  onChange: (value: string) => void;
  initialValue?: string;
  height?: string;
  allowUpload?: boolean;
  fileUploadOptions?: FileUploadOptions;
}

const IMAGE_MARKDOWN_REGEXP =
  /!\[([^\]]*)\]\(([^)\s]+)(?:\s*\{(\d+)x(\d+)\})?\)/;

const customTransformers: Transformer[] = [
  {
    dependencies: [ImageNode],
    export: (node: LexicalNode) => {
      if (node instanceof ImageNode) {
        return node.exportMarkdown();
      }
      return null;
    },
    importRegExp: IMAGE_MARKDOWN_REGEXP,
    regExp: IMAGE_MARKDOWN_REGEXP,
    replace: (textNode: TextNode, match: RegExpMatchArray) => {
      if (!match) return;

      try {
        const [fullMatch = "", altText = "", src = "", width, height] = match;

        if (!src) return;

        const cleanSrc = src.trim();

        const parsedWidth = width ? parseInt(width, 10) : "inherit";
        const parsedHeight = height ? parseInt(height, 10) : "inherit";

        const imageNode = $createImageNode({
          altText: altText || "",
          src: cleanSrc,
          maxWidth: 500,
          width: parsedWidth,
          height: parsedHeight,
        });

        const textContent = textNode.getTextContent();
        const imageMarkdownIndex = textContent.indexOf(fullMatch);

        if (imageMarkdownIndex === 0) {
          textNode.replace(imageNode);
        } else {
          const textBeforeImage = textContent.slice(0, imageMarkdownIndex);
          textNode.setTextContent(textBeforeImage);
          textNode.insertAfter(imageNode);
        }

        const textAfterImage = textContent.slice(
          imageMarkdownIndex + fullMatch.length,
        );
        if (textAfterImage) {
          const newTextNode = $createTextNode(textAfterImage);
          imageNode.insertAfter(newTextNode);
        }
      } catch (error) {
        console.error("Error creating image node:", error, match);
      }
    },
    type: "text-match",
  },
  ...TRANSFORMERS,
];

export default function RichTextEditor({
  onChange,
  initialValue,
  height = "300px",
  allowUpload = false,
  fileUploadOptions,
}: RichTextEditorProps) {
  const editorConfig = {
    namespace: "editor",
    theme: {
      ltr: "text-left",
      rtl: "text-right",
      paragraph: "mb-2",
      quote: "border-l-4 border-gray-300 dark:border-gray-700 pl-4 italic my-2",
      heading: {
        h1: "text-3xl font-bold mb-4",
        h2: "text-2xl font-bold mb-3",
        h3: "text-xl font-bold mb-3",
        h4: "text-lg font-bold mb-2",
        h5: "text-base font-bold mb-2",
      },
      list: {
        nested: {
          listitem: "list-none",
        },
        ol: "list-decimal list-inside mb-2",
        ul: "list-disc list-inside mb-2",
        listitem: "ml-2 mb-1",
      },
      link: "text-blue-500 hover:underline",
      text: {
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
        strikethrough: "line-through",
        underlineStrikethrough: "underline line-through",
        code: "bg-gray-200 dark:bg-gray-700 rounded px-1.5 py-0.5 font-mono text-sm",
      },
      code: "block bg-background border rounded p-4 font-mono text-sm my-2 overflow-x-auto relative",
      codeHighlight: {
        "code-language":
          "absolute top-3 right-3 text-xs text-muted-foreground bg-background px-2 py-1 rounded",
      },
    },
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
      ImageNode,
    ],
    onError(error: Error) {
      throw error;
    },
    editorState: () => {
      try {
        const state = $convertFromMarkdownString(
          initialValue ?? "",
          customTransformers,
        );
        return state;
      } catch (error) {
        console.error("Error converting markdown:", error);
        return $convertFromMarkdownString("", customTransformers);
      }
    },
  };
  return (
    <EditorErrorBoundary>
      <LexicalComposer initialConfig={editorConfig}>
        <div className="flex w-full flex-col">
          <ToolbarPlugin
            fileUploadOptions={fileUploadOptions}
            allowUpload={allowUpload}
          />
          <div className="relative">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className={cn(
                    "min-h-[200px] p-3 outline-none",
                    "overflow-y-auto rounded-b-md border border-t-0",
                    "bg-background text-foreground",
                    "focus:outline-none",
                    height,
                  )}
                />
              }
              placeholder={<Placeholder />}
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <AutoFocusPlugin />
            <ListPlugin />
            <CheckListPlugin />
            <ListMaxIndentLevelPlugin maxDepth={7} />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
            <OnChangePlugin
              onChange={(editorState) => {
                editorState.read(() => {
                  const markdown = $convertToMarkdownString(customTransformers);
                  if (typeof markdown === "string") {
                    onChange(markdown);
                  } else {
                    onChange("");
                  }
                });
              }}
            />
            <ImagesPlugin captionsEnabled={false} />
          </div>
        </div>
      </LexicalComposer>
    </EditorErrorBoundary>
  );
}
