"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";

import type {
  DropEdge,
  IDEState,
  LayoutNode,
  Pane,
  PaneId,
  SplitNode,
} from "./types";

const uid = () =>
  `id_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;

const initialPaneId = "pane_root";

const initialState: IDEState = {
  layout: {
    type: "pane",
    id: initialPaneId,
    tabs: [],
    activeTabId: null,
  },
  activePaneId: initialPaneId,
  bottomPanel: {
    visible: true,
    collapsed: false,
    position: "preview",
    active: "tests",
    height: 240,
  },
  sidebar: { visible: true, width: 240, active: "files" },
  preview: { visible: true, width: 520 },
};

type Action =
  | { type: "open"; path: string; paneId?: PaneId }
  | { type: "close"; paneId: PaneId; tabId: string }
  | { type: "activate-tab"; paneId: PaneId; tabId: string }
  | { type: "activate-pane"; paneId: PaneId }
  | {
      type: "move-tab";
      fromPaneId: PaneId;
      tabId: string;
      toPaneId: PaneId;
      toIndex?: number;
    }
  | {
      type: "split";
      fromPaneId: PaneId;
      tabId: string;
      toPaneId: PaneId;
      edge: DropEdge;
    }
  | { type: "rename-path"; oldPath: string; newPath: string }
  | { type: "delete-path"; path: string }
  | { type: "toggle-sidebar" }
  | { type: "set-sidebar-visible"; value: boolean }
  | { type: "set-sidebar-active"; value: IDEState["sidebar"]["active"] }
  | { type: "toggle-bottom" }
  | { type: "set-bottom-active"; value: IDEState["bottomPanel"]["active"] }
  | { type: "set-bottom-position"; value: IDEState["bottomPanel"]["position"] }
  | { type: "toggle-preview" }
  | { type: "pin"; paneId: PaneId; tabId: string };

function findPane(layout: LayoutNode, paneId: PaneId): Pane | null {
  if (layout.type === "pane") return layout.id === paneId ? layout : null;
  for (const c of layout.children) {
    const r = findPane(c, paneId);
    if (r) return r;
  }
  return null;
}

function firstPane(layout: LayoutNode): Pane {
  if (layout.type === "pane") return layout;
  for (const c of layout.children) {
    const r = firstPane(c);
    if (r) return r;
  }
  return layout as unknown as Pane;
}

function mapLayout(
  layout: LayoutNode,
  mapper: (n: LayoutNode) => LayoutNode,
): LayoutNode {
  const mapped = mapper(layout);
  if (mapped.type === "split") {
    return {
      ...mapped,
      children: mapped.children.map((c) => mapLayout(c, mapper)),
    };
  }
  return mapped;
}

function updatePane(
  layout: LayoutNode,
  paneId: PaneId,
  updater: (p: Pane) => Pane,
): LayoutNode {
  return mapLayout(layout, (n) =>
    n.type === "pane" && n.id === paneId ? updater(n) : n,
  );
}

function removeEmptyPanes(layout: LayoutNode): LayoutNode | null {
  if (layout.type === "pane") {
    return layout.tabs.length === 0 ? null : layout;
  }
  const kids = layout.children
    .map((c) => removeEmptyPanes(c))
    .filter((c): c is LayoutNode => c !== null);
  if (kids.length === 0) return null;
  if (kids.length === 1) return kids[0];
  return { ...layout, children: kids };
}

function findParentSplit(
  layout: LayoutNode,
  childId: string,
  parent: SplitNode | null = null,
): { parent: SplitNode | null; index: number } | null {
  if (layout.type === "split") {
    for (let i = 0; i < layout.children.length; i++) {
      if (layout.children[i].id === childId)
        return { parent: layout, index: i };
      const r = findParentSplit(layout.children[i], childId, layout);
      if (r) return r;
    }
  }
  if (layout.id === childId) return { parent, index: -1 };
  return null;
}

function splitPane(
  layout: LayoutNode,
  targetPaneId: PaneId,
  newPane: Pane,
  edge: Exclude<DropEdge, "center" | null>,
): LayoutNode {
  const dir: "horizontal" | "vertical" =
    edge === "left" || edge === "right" ? "horizontal" : "vertical";
  const insertBefore = edge === "left" || edge === "top";

  function go(node: LayoutNode): LayoutNode {
    if (node.type === "pane") {
      if (node.id !== targetPaneId) return node;
      const children: LayoutNode[] = insertBefore
        ? [newPane, node]
        : [node, newPane];
      const split: SplitNode = {
        type: "split",
        id: uid(),
        direction: dir,
        children,
      };
      return split;
    }
    if (node.direction === dir) {
      const idx = node.children.findIndex(
        (c) => c.type === "pane" && c.id === targetPaneId,
      );
      if (idx >= 0) {
        const newChildren = [...node.children];
        newChildren.splice(insertBefore ? idx : idx + 1, 0, newPane);
        return { ...node, children: newChildren };
      }
    }
    return { ...node, children: node.children.map(go) };
  }

  return go(layout);
}

function reducer(state: IDEState, action: Action): IDEState {
  switch (action.type) {
    case "open": {
      const targetId = action.paneId ?? state.activePaneId;
      const pane = findPane(state.layout, targetId) ?? firstPane(state.layout);
      const existing = pane.tabs.find((t) => t.path === action.path);
      const tabId = existing?.id ?? uid();
      const newTabs = existing
        ? pane.tabs
        : [...pane.tabs, { id: tabId, path: action.path }];
      return {
        ...state,
        layout: updatePane(state.layout, pane.id, (p) => ({
          ...p,
          tabs: newTabs,
          activeTabId: tabId,
        })),
        activePaneId: pane.id,
      };
    }
    case "close": {
      const pane = findPane(state.layout, action.paneId);
      if (!pane) return state;
      const idx = pane.tabs.findIndex((t) => t.id === action.tabId);
      const remaining = pane.tabs.filter((t) => t.id !== action.tabId);
      const nextActive =
        pane.activeTabId === action.tabId
          ? (remaining[idx]?.id ??
            remaining[idx - 1]?.id ??
            remaining[0]?.id ??
            null)
          : pane.activeTabId;
      const newLayout = updatePane(state.layout, action.paneId, (p) => ({
        ...p,
        tabs: remaining,
        activeTabId: nextActive,
      }));
      const pruned = removeEmptyPanes(newLayout) ?? {
        type: "pane",
        id: initialPaneId,
        tabs: [],
        activeTabId: null,
      };
      const newActivePane =
        findPane(pruned, state.activePaneId)?.id ?? firstPane(pruned).id;
      return { ...state, layout: pruned, activePaneId: newActivePane };
    }
    case "activate-tab":
      return {
        ...state,
        layout: updatePane(state.layout, action.paneId, (p) => ({
          ...p,
          activeTabId: action.tabId,
        })),
        activePaneId: action.paneId,
      };
    case "activate-pane":
      return { ...state, activePaneId: action.paneId };
    case "move-tab": {
      const from = findPane(state.layout, action.fromPaneId);
      const to = findPane(state.layout, action.toPaneId);
      if (!from || !to) return state;
      const tab = from.tabs.find((t) => t.id === action.tabId);
      if (!tab) return state;

      if (from.id === to.id) {
        const filtered = from.tabs.filter((t) => t.id !== action.tabId);
        const idx = action.toIndex ?? filtered.length;
        filtered.splice(idx, 0, tab);
        return {
          ...state,
          layout: updatePane(state.layout, from.id, (p) => ({
            ...p,
            tabs: filtered,
            activeTabId: tab.id,
          })),
          activePaneId: from.id,
        };
      }

      const fromRemaining = from.tabs.filter((t) => t.id !== action.tabId);
      const fromNextActive =
        from.activeTabId === action.tabId
          ? (fromRemaining[fromRemaining.length - 1]?.id ?? null)
          : from.activeTabId;

      let newLayout = updatePane(state.layout, from.id, (p) => ({
        ...p,
        tabs: fromRemaining,
        activeTabId: fromNextActive,
      }));

      const existing = to.tabs.find((t) => t.path === tab.path);
      if (existing) {
        newLayout = updatePane(newLayout, to.id, (p) => ({
          ...p,
          activeTabId: existing.id,
        }));
      } else {
        const newTabs = [...to.tabs];
        const idx = action.toIndex ?? newTabs.length;
        newTabs.splice(idx, 0, tab);
        newLayout = updatePane(newLayout, to.id, (p) => ({
          ...p,
          tabs: newTabs,
          activeTabId: tab.id,
        }));
      }

      const pruned = removeEmptyPanes(newLayout) ?? newLayout;
      return { ...state, layout: pruned, activePaneId: to.id };
    }
    case "split": {
      if (!action.edge || action.edge === "center") return state;
      const from = findPane(state.layout, action.fromPaneId);
      if (!from) return state;
      const tab = from.tabs.find((t) => t.id === action.tabId);
      if (!tab) return state;

      const fromRemaining = from.tabs.filter((t) => t.id !== action.tabId);

      let newLayout = updatePane(state.layout, from.id, (p) => ({
        ...p,
        tabs: fromRemaining,
        activeTabId:
          p.activeTabId === action.tabId
            ? (fromRemaining[fromRemaining.length - 1]?.id ?? null)
            : p.activeTabId,
      }));

      const newPane: Pane = {
        type: "pane",
        id: `pane_${uid()}`,
        tabs: [tab],
        activeTabId: tab.id,
      };

      newLayout = splitPane(newLayout, action.toPaneId, newPane, action.edge);
      const pruned = removeEmptyPanes(newLayout) ?? newLayout;
      return { ...state, layout: pruned, activePaneId: newPane.id };
    }
    case "rename-path": {
      const renamed = (layout: LayoutNode): LayoutNode => {
        if (layout.type === "pane") {
          return {
            ...layout,
            tabs: layout.tabs.map((t) =>
              t.path === action.oldPath ||
              t.path.startsWith(action.oldPath + "/")
                ? { ...t, path: t.path.replace(action.oldPath, action.newPath) }
                : t,
            ),
          };
        }
        return { ...layout, children: layout.children.map(renamed) };
      };
      return { ...state, layout: renamed(state.layout) };
    }
    case "delete-path": {
      const purge = (layout: LayoutNode): LayoutNode => {
        if (layout.type === "pane") {
          const remaining = layout.tabs.filter(
            (t) =>
              t.path !== action.path && !t.path.startsWith(action.path + "/"),
          );
          return {
            ...layout,
            tabs: remaining,
            activeTabId: remaining.find((t) => t.id === layout.activeTabId)
              ? layout.activeTabId
              : (remaining[remaining.length - 1]?.id ?? null),
          };
        }
        return { ...layout, children: layout.children.map(purge) };
      };
      const newLayout = removeEmptyPanes(purge(state.layout)) ?? {
        type: "pane",
        id: initialPaneId,
        tabs: [],
        activeTabId: null,
      };
      const newActive =
        findPane(newLayout, state.activePaneId)?.id ?? firstPane(newLayout).id;
      return { ...state, layout: newLayout, activePaneId: newActive };
    }
    case "pin": {
      return {
        ...state,
        layout: updatePane(state.layout, action.paneId, (p) => ({
          ...p,
          tabs: p.tabs.map((t) =>
            t.id === action.tabId ? { ...t, pinned: !t.pinned } : t,
          ),
        })),
      };
    }
    case "toggle-sidebar":
      return {
        ...state,
        sidebar: { ...state.sidebar, visible: !state.sidebar.visible },
      };
    case "set-sidebar-visible":
      if (state.sidebar.visible === action.value) return state;
      return { ...state, sidebar: { ...state.sidebar, visible: action.value } };
    case "set-sidebar-active":
      return {
        ...state,
        sidebar: {
          ...state.sidebar,
          active: action.value,
          visible:
            state.sidebar.active === action.value
              ? !state.sidebar.visible
              : true,
        },
      };
    case "toggle-bottom":
      return {
        ...state,
        bottomPanel: {
          ...state.bottomPanel,
          collapsed: !state.bottomPanel.collapsed,
        },
      };
    case "set-bottom-active":
      return {
        ...state,
        bottomPanel: {
          ...state.bottomPanel,
          active: action.value,
          collapsed:
            state.bottomPanel.active === action.value
              ? !state.bottomPanel.collapsed
              : false,
        },
      };
    case "set-bottom-position":
      return {
        ...state,
        bottomPanel: { ...state.bottomPanel, position: action.value },
      };
    case "toggle-preview":
      return {
        ...state,
        preview: { ...state.preview, visible: !state.preview.visible },
      };
    default:
      return state;
  }
}

type Ctx = {
  state: IDEState;
  openFile: (path: string, paneId?: PaneId) => void;
  closeTab: (paneId: PaneId, tabId: string) => void;
  activateTab: (paneId: PaneId, tabId: string) => void;
  activatePane: (paneId: PaneId) => void;
  moveTab: (
    fromPaneId: PaneId,
    tabId: string,
    toPaneId: PaneId,
    toIndex?: number,
  ) => void;
  splitWithTab: (
    fromPaneId: PaneId,
    tabId: string,
    toPaneId: PaneId,
    edge: Exclude<DropEdge, "center" | null>,
  ) => void;
  pinTab: (paneId: PaneId, tabId: string) => void;
  notifyRename: (oldPath: string, newPath: string) => void;
  notifyDelete: (path: string) => void;
  toggleSidebar: () => void;
  setSidebarVisible: (value: boolean) => void;
  setSidebarActive: (value: IDEState["sidebar"]["active"]) => void;
  toggleBottom: () => void;
  setBottomActive: (value: IDEState["bottomPanel"]["active"]) => void;
  setBottomPosition: (value: IDEState["bottomPanel"]["position"]) => void;
  togglePreview: () => void;
};

const IDECtx = createContext<Ctx | null>(null);

export function IDEProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Stable dispatcher refs — consumer effects deps stay constant across renders.
  const actionsRef = useRef<Omit<Ctx, "state"> | null>(null);
  if (actionsRef.current === null) {
    actionsRef.current = {
      openFile: (path, paneId) => dispatch({ type: "open", path, paneId }),
      closeTab: (paneId, tabId) => dispatch({ type: "close", paneId, tabId }),
      activateTab: (paneId, tabId) =>
        dispatch({ type: "activate-tab", paneId, tabId }),
      activatePane: (paneId) => dispatch({ type: "activate-pane", paneId }),
      moveTab: (fromPaneId, tabId, toPaneId, toIndex) =>
        dispatch({ type: "move-tab", fromPaneId, tabId, toPaneId, toIndex }),
      splitWithTab: (fromPaneId, tabId, toPaneId, edge) =>
        dispatch({ type: "split", fromPaneId, tabId, toPaneId, edge }),
      pinTab: (paneId, tabId) => dispatch({ type: "pin", paneId, tabId }),
      notifyRename: (oldPath, newPath) =>
        dispatch({ type: "rename-path", oldPath, newPath }),
      notifyDelete: (path) => dispatch({ type: "delete-path", path }),
      toggleSidebar: () => dispatch({ type: "toggle-sidebar" }),
      setSidebarVisible: (value) =>
        dispatch({ type: "set-sidebar-visible", value }),
      setSidebarActive: (value) =>
        dispatch({ type: "set-sidebar-active", value }),
      toggleBottom: () => dispatch({ type: "toggle-bottom" }),
      setBottomActive: (value) =>
        dispatch({ type: "set-bottom-active", value }),
      setBottomPosition: (value) =>
        dispatch({ type: "set-bottom-position", value }),
      togglePreview: () => dispatch({ type: "toggle-preview" }),
    };
  }

  const value = useMemo<Ctx>(
    () => ({ state, ...actionsRef.current! }),
    [state],
  );

  return <IDECtx.Provider value={value}>{children}</IDECtx.Provider>;
}

export function useIDE() {
  const ctx = useContext(IDECtx);
  if (!ctx) throw new Error("useIDE must be used inside IDEProvider");
  return ctx;
}

export { findPane, firstPane, findParentSplit };
