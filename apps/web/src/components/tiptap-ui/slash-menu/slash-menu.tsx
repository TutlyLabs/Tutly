"use client"

import * as React from "react"
import { Editor } from "@tiptap/react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Icons
import {
  TypeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  CodeIcon,
  ImageIcon,
  MinusIcon,
  CheckSquareIcon
} from "lucide-react"

export interface SlashMenuItem {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  keywords: string[]
  group: string
  onSelect: (editor: Editor) => void
}

const SLASH_MENU_ITEMS: SlashMenuItem[] = [
  {
    title: "Text",
    description: "Start writing with plain text",
    icon: TypeIcon,
    keywords: ["text", "paragraph", "p"],
    group: "Basic",
    onSelect: (editor) => {
      editor.chain().focus().setParagraph().run()
    },
  },
  {
    title: "Heading 1",
    description: "Big section heading",
    icon: Heading1Icon,
    keywords: ["h1", "heading", "title", "big"],
    group: "Headings",
    onSelect: (editor) => {
      editor.chain().focus().toggleHeading({ level: 1 }).run()
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: Heading2Icon,
    keywords: ["h2", "heading", "subtitle", "medium"],
    group: "Headings",
    onSelect: (editor) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run()
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: Heading3Icon,
    keywords: ["h3", "heading", "small"],
    group: "Headings",
    onSelect: (editor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run()
    },
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: ListIcon,
    keywords: ["bullet", "list", "ul", "unordered"],
    group: "Lists",
    onSelect: (editor) => {
      editor.chain().focus().toggleBulletList().run()
    },
  },
  {
    title: "Numbered List",
    description: "Create a list with numbering",
    icon: ListOrderedIcon,
    keywords: ["numbered", "list", "ol", "ordered"],
    group: "Lists",
    onSelect: (editor) => {
      editor.chain().focus().toggleOrderedList().run()
    },
  },
  {
    title: "Task List",
    description: "Create a task list with checkboxes",
    icon: CheckSquareIcon,
    keywords: ["task", "todo", "checkbox", "checklist"],
    group: "Lists",
    onSelect: (editor) => {
      editor.chain().focus().toggleTaskList().run()
    },
  },
  {
    title: "Quote",
    description: "Insert a quote or callout",
    icon: QuoteIcon,
    keywords: ["quote", "blockquote", "callout"],
    group: "Blocks",
    onSelect: (editor) => {
      editor.chain().focus().setBlockquote().run()
    },
  },
  {
    title: "Code Block",
    description: "Insert a code block",
    icon: CodeIcon,
    keywords: ["code", "codeblock", "syntax"],
    group: "Blocks",
    onSelect: (editor) => {
      editor.chain().focus().setCodeBlock().run()
    },
  },
  {
    title: "Image",
    description: "Upload or embed an image",
    icon: ImageIcon,
    keywords: ["image", "photo", "picture", "upload"],
    group: "Media",
    onSelect: (editor) => {
      editor.chain().focus().setImageUploadNode().run()
    },
  },
  {
    title: "Divider",
    description: "Insert a horizontal divider",
    icon: MinusIcon,
    keywords: ["divider", "line", "separator", "hr"],
    group: "Blocks",
    onSelect: (editor) => {
      editor.chain().focus().setHorizontalRule().run()
    },
  },
]

interface SlashMenuProps {
  editor: Editor | null
  isOpen: boolean
  onClose: () => void
  query: string
  position: { top: number; left: number }
  replaceCommand: (editor: Editor, commandText: string) => void
}

export function SlashMenu({ editor, isOpen, onClose, query, position, replaceCommand }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  // Filter items based on query
  const filteredItems = React.useMemo(() => {
    if (!query) return SLASH_MENU_ITEMS

    const lowercaseQuery = query.toLowerCase()
    return SLASH_MENU_ITEMS.filter(item =>
      item.title.toLowerCase().includes(lowercaseQuery) ||
      item.description.toLowerCase().includes(lowercaseQuery) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(lowercaseQuery))
    )
  }, [query])

  // Group items by category
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, SlashMenuItem[]> = {}
    filteredItems.forEach(item => {
      if (!groups[item.group]) {
        groups[item.group] = []
      }
      groups[item.group].push(item)
    })
    return groups
  }, [filteredItems])

  const handleSelect = React.useCallback((item: SlashMenuItem) => {
    if (!editor) return;

    // Execute the command and replace the slash command text
    item.onSelect(editor);
    replaceCommand(editor, "");
    onClose();
  }, [editor, replaceCommand, onClose]);

  const handleKeyDown = React.useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    console.log("SlashMenu handleKeyDown:", event.key, "isOpen:", isOpen);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
        break;
      case "Enter":
        event.preventDefault();
        event.stopPropagation();
        console.log("Enter pressed, selectedIndex:", selectedIndex, "filteredItems:", filteredItems.length);
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        onClose();
        break;
      case " ":
        // Close menu if user types space
        event.preventDefault();
        event.stopPropagation();
        onClose();
        break;
    }
  }, [isOpen, filteredItems, selectedIndex, handleSelect, onClose]);

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  React.useEffect(() => {
    const handleKeyDownGlobal = (event: KeyboardEvent) => {
      handleKeyDown(event);
    };

    if (isOpen && editor) {
      // Attach to the editor element with capture phase to intercept before Tiptap
      const editorElement = editor.view.dom;
      editorElement.addEventListener("keydown", handleKeyDownGlobal, { capture: true });
      document.addEventListener("keydown", handleKeyDownGlobal, { capture: true });

      return () => {
        editorElement.removeEventListener("keydown", handleKeyDownGlobal, { capture: true });
        document.removeEventListener("keydown", handleKeyDownGlobal, { capture: true });
      };
    }
  }, [isOpen, handleKeyDown, editor]);

  if (!isOpen || !editor) return null

  return (
    <div
      className="fixed z-50"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="w-72 rounded-lg border bg-background shadow-md">
        <div className="p-2">
          <input
            type="text"
            placeholder="Search commands..."
            value={query}
            className="w-full bg-transparent px-2 py-1 text-sm outline-none"
            readOnly
          />
        </div>
        <div className="max-h-80 overflow-y-auto">
          {Object.keys(groupedItems).length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No commands found.
            </div>
          ) : (
            Object.entries(groupedItems).map(([groupName, items]) => (
              <div key={groupName}>
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  {groupName}
                </div>
                {items.map((item, index) => {
                  const globalIndex = filteredItems.indexOf(item)
                  const isSelected = globalIndex === selectedIndex

                  return (
                    <div
                      key={item.title}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent",
                        isSelected && "bg-accent"
                      )}
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        /
                      </Badge>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
