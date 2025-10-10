"use client";

import * as React from "react";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Selection } from "@tiptap/extensions";

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import { ImageResize } from "@/components/tiptap-node/image-resize";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/image-resize/image-resize.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover";
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";

// --- Hooks ---
import { useIsMobile } from "@/hooks/use-mobile";
import { useWindowSize } from "@/hooks/use-window-size";
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";

// --- Lib ---
import {
  useImageUploadNodeManager,
  useTiptapFileUpload,
  MAX_FILE_SIZE,
  type FileUploadOptions,
} from "@/lib/tiptap-file-upload";

// --- Styles ---
import "./styles.scss";

// --- Utils ---
import { cn } from "@/lib/utils";
import { JsonValue } from "@prisma/client/runtime/library";

const convertStringToJson = (text: string) => {
  if (!text || text.trim() === "") {
    return {
      type: "doc",
      content: [],
    };
  }

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: text }],
      },
    ],
  };
};

interface RichTextEditorProps {
  onChange: (jsonValue: string) => void;
  initialValue?: string | JsonValue;
  height?: string;
  allowUpload?: boolean;
  fileUploadOptions?: FileUploadOptions;
  readonly?: boolean;
  className?: string;
}

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
  allowUpload = false,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  isMobile: boolean;
  allowUpload?: boolean;
}) => {
  return (
    <>
      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        <ListDropdownMenu
          types={["bulletList", "orderedList", "taskList"]}
          portal={isMobile}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      {allowUpload && (
        <>
          <ToolbarSeparator />
          <ToolbarGroup>
            <ImageUploadButton text="Add" />
          </ToolbarGroup>
        </>
      )}

      {isMobile && <ToolbarSeparator />}
    </>
  );
};

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link";
  onBack: () => void;
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
);

export default function RichTextEditor({
  onChange,
  initialValue,
  height = "300px",
  allowUpload = false,
  fileUploadOptions,
  readonly = false,
  className,
}: RichTextEditorProps) {
  const [isLegacyContent, setIsLegacyContent] = React.useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = React.useState(false);

  const initialContent = React.useMemo(() => {
    if (!initialValue) return "";

    if (typeof initialValue === "object" && initialValue !== null) {
      if ("type" in initialValue && initialValue.type === "doc") {
        return initialValue;
      }
      return initialValue;
    }

    if (typeof initialValue === "string") {
      try {
        const parsed = JSON.parse(initialValue);
        if (
          parsed &&
          typeof parsed === "object" &&
          "type" in parsed &&
          parsed.type === "doc"
        ) {
          return parsed;
        }
      } catch {
        // If it's not valid JSON, treat as plain text (legacy content)
        const jsonContent = convertStringToJson(initialValue);
        return jsonContent;
      }
    }

    return initialValue;
  }, [initialValue]);

  // Determine if content is legacy in a separate effect
  React.useEffect(() => {
    // Reset banner dismissal when initial value changes
    setIsBannerDismissed(false);

    if (!initialValue) {
      setIsLegacyContent(false);
      return;
    }

    if (typeof initialValue === "object" && initialValue !== null) {
      setIsLegacyContent(false);
      return;
    }

    if (typeof initialValue === "string") {
      try {
        const parsed = JSON.parse(initialValue);
        if (
          parsed &&
          typeof parsed === "object" &&
          "type" in parsed &&
          parsed.type === "doc"
        ) {
          setIsLegacyContent(false);
          return;
        }
      } catch {
        // If it's not valid JSON, treat as plain text (legacy content)
        setIsLegacyContent(true);
        return;
      }
    }

    setIsLegacyContent(false);
  }, [initialValue]);
  const isMobile = useIsMobile();
  const { height: windowHeight } = useWindowSize();
  const [mobileView, setMobileView] = React.useState<
    "main" | "highlighter" | "link"
  >("main");
  const toolbarRef = React.useRef<HTMLDivElement>(null);
  const { triggerImageUpload } = useImageUploadNodeManager(fileUploadOptions);
  const { uploadFile } = useTiptapFileUpload(fileUploadOptions);

  const customUploadFile = React.useCallback(
    async (
      file: File,
      onProgress?: (event: { progress: number }) => void,
      abortSignal?: AbortSignal,
    ): Promise<string> => {
      if (fileUploadOptions?.onUpload) {
        await fileUploadOptions.onUpload(file);
        return URL.createObjectURL(file);
      }

      return uploadFile(file, onProgress, abortSignal);
    },
    [uploadFile, fileUploadOptions],
  );

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editable: !readonly,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": readonly
          ? "Read-only content area."
          : "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      ImageResize,
      Typography,
      Superscript,
      Subscript,
      Selection,
      ...(allowUpload
        ? [
            ImageUploadNode.configure({
              accept: fileUploadOptions?.allowedExtensions
                ? fileUploadOptions.allowedExtensions
                    .map((ext) => `image/${ext}`)
                    .join(",")
                : "image/*",
              maxSize: MAX_FILE_SIZE,
              limit: 3,
              upload: customUploadFile,
              onError: (error) => console.error("Upload failed:", error),
            }),
          ]
        : []),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange(JSON.stringify(json));
    },
  });

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  });

  React.useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main");
    }
  }, [isMobile, mobileView]);

  React.useEffect(() => {
    if (!editor) return;

    const handlePaste = (event: ClipboardEvent) => {
      if (!allowUpload) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.type.startsWith("image/")) {
          event.preventDefault();

          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        triggerImageUpload(editor, imageFiles);
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener("paste", handlePaste);

    return () => {
      editorElement.removeEventListener("paste", handlePaste);
    };
  }, [editor, triggerImageUpload, allowUpload]);

  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden",
        !readonly && "rounded-md border",
        className,
      )}
    >
      <EditorContext.Provider value={{ editor }}>
        {!readonly && (
          <Toolbar
            ref={toolbarRef}
            style={{
              ...(isMobile
                ? {
                    bottom: `calc(100% - ${windowHeight - rect.y}px)`,
                  }
                : {}),
            }}
          >
            {mobileView === "main" ? (
              <MainToolbarContent
                onHighlighterClick={() => setMobileView("highlighter")}
                onLinkClick={() => setMobileView("link")}
                isMobile={isMobile}
                allowUpload={allowUpload}
              />
            ) : (
              <MobileToolbarContent
                type={mobileView === "highlighter" ? "highlighter" : "link"}
                onBack={() => setMobileView("main")}
              />
            )}
          </Toolbar>
        )}

        {isLegacyContent && !readonly && !isBannerDismissed && (
          <div className="border-b border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-yellow-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  You are editing legacy markdown content. Please format it
                  properly using the editor tools to update to the new
                  configuration.
                </span>
              </div>
              <button
                onClick={() => setIsBannerDismissed(true)}
                className="rounded-sm p-1 text-yellow-600 transition-colors hover:bg-yellow-100 hover:text-yellow-800"
                aria-label="Dismiss warning"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="relative">
          <EditorContent
            editor={editor}
            role="presentation"
            className={cn(
              "p-1 outline-none",
              "overflow-y-auto",
              !readonly && "rounded-b-md border-t-0",
              "bg-background text-foreground",
              "focus:outline-none",
              "simple-editor-content",
              height,
            )}
          />
        </div>
      </EditorContext.Provider>
    </div>
  );
}
