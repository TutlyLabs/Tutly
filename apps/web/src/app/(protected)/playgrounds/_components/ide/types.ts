export type FileNode = {
  type: "file";
  path: string;
  name: string;
};

export type FolderNode = {
  type: "folder";
  path: string;
  name: string;
  children: TreeNode[];
};

export type TreeNode = FileNode | FolderNode;

export type TabId = string;

export type Tab = {
  id: TabId;
  path: string;
  pinned?: boolean;
};

export type PaneId = string;

export type Pane = {
  type: "pane";
  id: PaneId;
  tabs: Tab[];
  activeTabId: TabId | null;
};

export type SplitDirection = "horizontal" | "vertical";

export type SplitNode = {
  type: "split";
  id: string;
  direction: SplitDirection;
  children: LayoutNode[];
  sizes?: number[];
};

export type LayoutNode = Pane | SplitNode;

export type DropEdge = "left" | "right" | "top" | "bottom" | "center" | null;

export type IDEState = {
  layout: LayoutNode;
  activePaneId: PaneId;
  bottomPanel: {
    visible: boolean;
    collapsed: boolean;
    position: "editor" | "preview";
    active: "console" | "problems" | "tests";
    height: number;
  };
  sidebar: {
    visible: boolean;
    width: number;
    active: "files" | "search" | "settings";
  };
  preview: {
    visible: boolean;
    width: number;
  };
};
