"use client";

import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  Download,
  FilePlus,
  FolderPlus,
  Lock,
  Upload,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { cn } from "@tutly/utils";

import { downloadProjectZip, readFilesForImport } from "./fileOps";
import { FileIcon, FolderIcon } from "./FileIcon";
import IconButton from "./IconButton";
import { EditableScopeContext, isPathWritable } from "./ideOptions";
import { useIDE } from "./ideStore";
import type { TreeNode } from "./types";
import { useFiles } from "./useFiles";
import { useContext } from "react";
import { toast } from "sonner";

type ContextTarget =
  | { kind: "file"; path: string }
  | { kind: "folder"; path: string }
  | { kind: "root" };

type ContextMenuState = {
  x: number;
  y: number;
  target: ContextTarget;
} | null;

type CreateState = { kind: "file" | "folder"; parent: string } | null;

type RenameState = { path: string } | null;

type Expanded = Record<string, boolean>;

const dragMime = "application/x-tutly-path";

function isDescendant(parent: string, child: string) {
  return child === parent || child.startsWith(parent + "/");
}

export default function FileTree() {
  const scopeForTree = useContext(EditableScopeContext);
  // Restrict to visibleFiles when the scope is locked.
  const restrictTree = !!(scopeForTree.allowList || scopeForTree.templatePaths);
  const {
    tree,
    addFile,
    deleteFile,
    deleteFolder,
    renameFile,
    renameFolder,
    files,
  } = useFiles({ respectVisibleFiles: restrictTree });
  const { openFile, notifyRename, notifyDelete, state } = useIDE();

  const activePath = useMemo(() => {
    const find = (n: any): string | null => {
      if (n.type === "pane" && n.id === state.activePaneId) {
        const t = n.tabs.find((x: any) => x.id === n.activeTabId);
        return t?.path ?? null;
      }
      if (n.type === "split") {
        for (const c of n.children) {
          const r = find(c);
          if (r) return r;
        }
      }
      return null;
    };
    return find(state.layout);
  }, [state.layout, state.activePaneId]);

  const [expanded, setExpanded] = useState<Expanded>(() => {
    const init: Expanded = {};
    const walk = (nodes: TreeNode[], depth: number) => {
      for (const n of nodes) {
        if (n.type === "folder") {
          if (depth < 1) init[n.path] = true;
          walk(n.children, depth + 1);
        }
      }
    };
    walk(tree, 0);
    return init;
  });

  const [menu, setMenu] = useState<ContextMenuState>(null);
  const [creating, setCreating] = useState<CreateState>(null);
  const [renaming, setRenaming] = useState<RenameState>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const editableScope = useContext(EditableScopeContext);
  const projectName = editableScope.projectName ?? "tutly-project";

  const isWritable = (path: string) =>
    isPathWritable(path, editableScope, files[path]?.readOnly);

  const handleImport = async (incoming: FileList | File[]) => {
    const { files: imported, skipped } = await readFilesForImport(incoming);
    const allowed: typeof imported = [];
    const protectedFiles: string[] = [];
    for (const f of imported) {
      const existsReadOnly = files[f.path]?.readOnly;
      const writable = isPathWritable(f.path, editableScope, existsReadOnly);
      if (!writable) {
        protectedFiles.push(f.path);
        continue;
      }
      allowed.push(f);
    }
    for (const f of allowed) addFile(f.path, f.text);

    const parts: string[] = [];
    if (allowed.length)
      parts.push(
        `${allowed.length} file${allowed.length === 1 ? "" : "s"} imported`,
      );
    if (protectedFiles.length)
      parts.push(`${protectedFiles.length} skipped (protected by template)`);
    if (skipped.length)
      parts.push(`${skipped.length} skipped (binary or too large)`);
    if (parts.length) {
      if (protectedFiles.length || skipped.length) {
        toast.warning(parts.join(" · "));
      } else {
        toast.success(parts.join(" · "));
      }
    }
  };

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("blur", close);
    };
  }, [menu]);

  useEffect(() => {
    const onImport = (e: Event) => {
      const detail = (e as CustomEvent).detail as FileList | undefined;
      if (detail) void handleImport(detail);
    };
    window.addEventListener("tutly:import-files", onImport);
    return () => window.removeEventListener("tutly:import-files", onImport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureFolderOpen = useCallback(
    (path: string) => setExpanded((e) => ({ ...e, [path]: true })),
    [],
  );

  const onCreate = (kind: "file" | "folder", parent: string) => {
    ensureFolderOpen(parent || "/");
    setCreating({ kind, parent });
  };

  const finishCreate = (name: string) => {
    if (!creating || !name) {
      setCreating(null);
      return;
    }
    const base = creating.parent || "";
    const fullPath = (base ? `${base}/${name}` : `/${name}`).replace(
      /\/+/g,
      "/",
    );
    if (creating.kind === "file") {
      if (!files[fullPath]) {
        addFile(fullPath, "");
        openFile(fullPath);
      }
    } else {
      const placeholder = `${fullPath}/.gitkeep`;
      if (!files[placeholder]) addFile(placeholder, "");
      ensureFolderOpen(fullPath);
    }
    setCreating(null);
  };

  const finishRename = (newName: string) => {
    if (!renaming || !newName) {
      setRenaming(null);
      return;
    }
    const oldPath = renaming.path;
    const dir = oldPath.slice(0, oldPath.lastIndexOf("/")) || "";
    const newPath = `${dir}/${newName}`;
    if (newPath === oldPath) {
      setRenaming(null);
      return;
    }
    if (files[oldPath]) {
      renameFile(oldPath, newPath);
    } else {
      renameFolder(oldPath, newPath);
    }
    notifyRename(oldPath, newPath);
    setRenaming(null);
  };

  const onDelete = (path: string) => {
    if (files[path]) deleteFile(path);
    else deleteFolder(path);
    notifyDelete(path);
  };

  const onMove = (srcPath: string, destFolder: string) => {
    if (srcPath === destFolder) return;
    if (isDescendant(srcPath, destFolder)) return;
    const name = srcPath.split("/").pop()!;
    const newPath = `${destFolder}/${name}`.replace(/\/+/g, "/");
    if (newPath === srcPath) return;
    if (files[srcPath]) {
      renameFile(srcPath, newPath);
    } else {
      renameFolder(srcPath, newPath);
    }
    notifyRename(srcPath, newPath);
  };

  const handleRootDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const src = e.dataTransfer.getData(dragMime);
    if (src) onMove(src, "");
  };

  return (
    <div
      className="flex h-full flex-col text-[13px]"
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest("[data-tree-row]")) return;
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY, target: { kind: "root" } });
      }}
    >
      <div className="bg-muted/40 flex h-9 shrink-0 items-center justify-between border-b px-2.5 select-none">
        <div className="text-muted-foreground text-[10px] font-bold tracking-[0.16em] uppercase">
          Files
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton tooltip="New File" onClick={() => onCreate("file", "")}>
            <FilePlus className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            tooltip="New Folder"
            onClick={() => onCreate("folder", "")}
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            tooltip="Upload Files…"
            onClick={() => filesInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            tooltip="Download Project (.zip)"
            shortcut="⌘⇧S"
            onClick={() => downloadProjectZip(files, projectName)}
          >
            <Download className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            tooltip="Collapse All Folders"
            onClick={() => setExpanded({})}
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      <input
        ref={filesInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void handleImport(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        hidden
        // @ts-expect-error webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        directory=""
        onChange={(e) => {
          if (e.target.files) void handleImport(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        className={cn(
          "flex-1 overflow-auto py-1 transition-colors",
          dragOver === "__root__" &&
            "bg-accent/40 ring-primary/30 ring-1 ring-inset",
          dragOver === "__os__" &&
            "bg-primary/10 ring-primary/40 ring-1 ring-inset",
        )}
        onDragOver={(e) => {
          const types = e.dataTransfer.types;
          if (types.includes(dragMime)) {
            e.preventDefault();
            setDragOver("__root__");
            return;
          }
          if (types.includes("Files")) {
            e.preventDefault();
            setDragOver("__os__");
          }
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => {
          setDragOver(null);
          const internal = e.dataTransfer.getData(dragMime);
          if (internal) {
            handleRootDrop(e);
            return;
          }
          if (e.dataTransfer.files.length > 0) {
            e.preventDefault();
            void handleImport(e.dataTransfer.files);
          }
        }}
      >
        {tree.length === 0 && !creating && (
          <div className="text-muted-foreground px-3 py-6 text-center text-xs">
            No files yet. Right-click to create.
          </div>
        )}
        {creating && creating.parent === "" && (
          <NewRow
            kind={creating.kind}
            depth={0}
            onCommit={finishCreate}
            onCancel={() => setCreating(null)}
          />
        )}
        {tree.map((node) => (
          <TreeRow
            key={node.path}
            node={node}
            depth={0}
            expanded={expanded}
            setExpanded={setExpanded}
            onOpen={(path) => openFile(path)}
            onContext={(target, x, y) => setMenu({ x, y, target })}
            creating={creating}
            renaming={renaming}
            finishCreate={finishCreate}
            finishRename={finishRename}
            cancelCreate={() => setCreating(null)}
            cancelRename={() => setRenaming(null)}
            onMove={onMove}
            dragOver={dragOver}
            setDragOver={setDragOver}
            activePath={activePath}
          />
        ))}
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          target={menu.target}
          onClose={() => setMenu(null)}
          onAction={(action, target) => {
            setMenu(null);
            if (target.kind === "file") {
              const writable = isWritable(target.path);
              if (action === "rename") {
                if (!writable) {
                  toast.error("This file is protected by the template.");
                  return;
                }
                setRenaming({ path: target.path });
              }
              if (action === "delete") {
                if (!writable) {
                  toast.error("This file is protected by the template.");
                  return;
                }
                onDelete(target.path);
              }
              if (action === "duplicate") {
                const base = target.path;
                const code = files[base]?.code ?? "";
                const dot = base.lastIndexOf(".");
                const next =
                  dot >= 0
                    ? `${base.slice(0, dot)}-copy${base.slice(dot)}`
                    : `${base}-copy`;
                if (!isWritable(next)) {
                  toast.error("Cannot create copy here — path is protected.");
                  return;
                }
                addFile(next, code);
              }
              if (action === "copy-path")
                void navigator.clipboard.writeText(target.path);
            } else if (target.kind === "folder") {
              if (action === "new-file") onCreate("file", target.path);
              if (action === "new-folder") onCreate("folder", target.path);
              if (action === "rename") setRenaming({ path: target.path });
              if (action === "delete") onDelete(target.path);
              if (action === "copy-path")
                void navigator.clipboard.writeText(target.path);
              if (action === "upload") filesInputRef.current?.click();
            } else {
              if (action === "new-file") onCreate("file", "");
              if (action === "new-folder") onCreate("folder", "");
              if (action === "upload") filesInputRef.current?.click();
              if (action === "upload-folder") folderInputRef.current?.click();
              if (action === "download")
                void downloadProjectZip(files, projectName);
            }
          }}
        />
      )}
    </div>
  );
}

function TreeRow({
  node,
  depth,
  expanded,
  setExpanded,
  onOpen,
  onContext,
  creating,
  renaming,
  finishCreate,
  finishRename,
  cancelCreate,
  cancelRename,
  onMove,
  dragOver,
  setDragOver,
  activePath,
}: {
  node: TreeNode;
  depth: number;
  expanded: Expanded;
  setExpanded: (fn: (e: Expanded) => Expanded) => void;
  onOpen: (path: string) => void;
  onContext: (target: ContextTarget, x: number, y: number) => void;
  creating: CreateState;
  renaming: RenameState;
  finishCreate: (name: string) => void;
  finishRename: (name: string) => void;
  cancelCreate: () => void;
  cancelRename: () => void;
  onMove: (src: string, destFolder: string) => void;
  dragOver: string | null;
  setDragOver: (v: string | null) => void;
  activePath: string | null;
}) {
  const { files } = useFiles();
  const editableScope = useContext(EditableScopeContext);
  const isExpanded = node.type === "folder" && expanded[node.path];
  const isRenaming = renaming?.path === node.path;
  const isDropTarget = dragOver === node.path;
  const isActive = activePath === node.path;
  const readOnly =
    node.type === "file" &&
    !isPathWritable(node.path, editableScope, files[node.path]?.readOnly);

  const onDragStart = (e: DragEvent) => {
    if (readOnly) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData(dragMime, node.path);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: DragEvent) => {
    if (node.type !== "folder") return;
    if (!e.dataTransfer.types.includes(dragMime)) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(node.path);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    if (node.type !== "folder") return;
    const src = e.dataTransfer.getData(dragMime);
    if (src) onMove(src, node.path);
  };

  const handleClick = () => {
    if (node.type === "folder") {
      setExpanded((s) => ({ ...s, [node.path]: !s[node.path] }));
    } else {
      onOpen(node.path);
    }
  };

  return (
    <div>
      <div
        data-tree-row
        className={cn(
          "group hover:bg-accent/50 flex h-[26px] cursor-pointer items-center gap-1.5 pr-2 text-[13px]",
          isActive && "bg-primary/15 text-foreground hover:bg-primary/15",
          isDropTarget && "bg-accent ring-primary/40 ring-1",
        )}
        style={{ paddingLeft: 8 + depth * 12 }}
        draggable={!isRenaming}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={(e) => {
          e.stopPropagation();
          if (dragOver === node.path) setDragOver(null);
        }}
        onDrop={onDrop}
        onClick={(e: MouseEvent) => {
          if (isRenaming) return;
          e.stopPropagation();
          handleClick();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContext(
            node.type === "file"
              ? { kind: "file", path: node.path }
              : { kind: "folder", path: node.path },
            e.clientX,
            e.clientY,
          );
        }}
      >
        <span className="text-muted-foreground/70 flex h-4 w-4 shrink-0 items-center justify-center">
          {node.type === "folder" &&
            (isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            ))}
        </span>
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {node.type === "folder" ? (
            <FolderIcon open={!!isExpanded} className="h-4 w-4 shrink-0" />
          ) : (
            <FileIcon path={node.path} className="h-4 w-4 shrink-0" />
          )}
        </span>
        {isRenaming ? (
          <RenameInput
            initial={node.name}
            onCommit={finishRename}
            onCancel={cancelRename}
          />
        ) : (
          <span
            className={cn(
              "truncate select-none",
              readOnly && "text-muted-foreground",
            )}
          >
            {node.name}
          </span>
        )}
        {readOnly && (
          <Lock
            className="text-muted-foreground/70 ml-auto h-3 w-3 shrink-0"
            aria-label="Protected by template"
          />
        )}
      </div>

      {node.type === "folder" && isExpanded && (
        <div>
          {creating && creating.parent === node.path && (
            <NewRow
              kind={creating.kind}
              depth={depth + 1}
              onCommit={finishCreate}
              onCancel={cancelCreate}
            />
          )}
          {node.children.map((c) => (
            <TreeRow
              key={c.path}
              node={c}
              depth={depth + 1}
              expanded={expanded}
              setExpanded={setExpanded}
              onOpen={onOpen}
              onContext={onContext}
              creating={creating}
              renaming={renaming}
              finishCreate={finishCreate}
              finishRename={finishRename}
              cancelCreate={cancelCreate}
              cancelRename={cancelRename}
              onMove={onMove}
              dragOver={dragOver}
              setDragOver={setDragOver}
              activePath={activePath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RenameInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const dot = initial.lastIndexOf(".");
    el.setSelectionRange(0, dot > 0 ? dot : initial.length);
  }, [initial]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onCommit(value.trim());
    if (e.key === "Escape") onCancel();
  };

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKey}
      onBlur={() => onCommit(value.trim())}
      onClick={(e) => e.stopPropagation()}
      className="border-primary/60 bg-background ring-primary/40 h-5 flex-1 rounded-sm border px-1 text-[12px] ring-1 outline-none"
    />
  );
}

function NewRow({
  kind,
  depth,
  onCommit,
  onCancel,
}: {
  kind: "file" | "folder";
  depth: number;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="flex h-[26px] items-center gap-1.5 pr-2"
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      <span className="text-muted-foreground/70 flex h-4 w-4 shrink-0 items-center justify-center">
        {kind === "folder" && <ChevronRight className="h-3.5 w-3.5" />}
      </span>
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        {kind === "folder" ? (
          <FolderIcon className="h-4 w-4 shrink-0" />
        ) : (
          <FileIcon path="untitled.txt" className="h-4 w-4 shrink-0" />
        )}
      </span>
      <RenameInput initial="" onCommit={onCommit} onCancel={onCancel} />
    </div>
  );
}

function ContextMenu({
  x,
  y,
  target,
  onClose,
  onAction,
}: {
  x: number;
  y: number;
  target: ContextTarget;
  onClose: () => void;
  onAction: (
    action:
      | "new-file"
      | "new-folder"
      | "rename"
      | "delete"
      | "duplicate"
      | "copy-path"
      | "upload"
      | "upload-folder"
      | "download",
    target: ContextTarget,
  ) => void;
}) {
  type MenuItem = {
    id:
      | "new-file"
      | "new-folder"
      | "rename"
      | "delete"
      | "duplicate"
      | "copy-path"
      | "upload"
      | "upload-folder"
      | "download";
    label: string;
    shortcut?: string;
    danger?: boolean;
  };

  const items: MenuItem[] = useMemo(() => {
    if (target.kind === "file") {
      return [
        { id: "rename", label: "Rename", shortcut: "F2" },
        { id: "duplicate", label: "Duplicate" },
        { id: "copy-path", label: "Copy Path" },
        { id: "delete", label: "Delete", danger: true, shortcut: "⌫" },
      ];
    }
    if (target.kind === "folder") {
      return [
        { id: "new-file", label: "New File" },
        { id: "new-folder", label: "New Folder" },
        { id: "upload", label: "Upload Files Here…" },
        { id: "rename", label: "Rename", shortcut: "F2" },
        { id: "copy-path", label: "Copy Path" },
        { id: "delete", label: "Delete", danger: true, shortcut: "⌫" },
      ];
    }
    return [
      { id: "new-file", label: "New File" },
      { id: "new-folder", label: "New Folder" },
      { id: "upload", label: "Upload Files…" },
      { id: "upload-folder", label: "Upload Folder…" },
      { id: "download", label: "Download Project (.zip)", shortcut: "⌘⇧S" },
    ];
  }, [target]);

  return (
    <div
      className="bg-popover fixed z-50 min-w-[200px] rounded-md border p-1 text-sm shadow-md"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => (
        <button
          key={item.id + i}
          type="button"
          onClick={() => onAction(item.id, target)}
          className={cn(
            "hover:bg-accent flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left",
            item.danger && "text-red-500 hover:bg-red-500/10",
          )}
        >
          <span>{item.label}</span>
          {item.shortcut && (
            <span className="text-muted-foreground text-xs">
              {item.shortcut}
            </span>
          )}
        </button>
      ))}
      <button type="button" onClick={onClose} className="hidden" aria-hidden>
        close
      </button>
    </div>
  );
}
