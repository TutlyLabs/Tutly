"use client";

import { useSandpack } from "@codesandbox/sandpack-react";
import { useMemo } from "react";

import type { TreeNode } from "./types";

export function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  const sorted = [...paths].sort((a, b) => a.localeCompare(b));

  for (const path of sorted) {
    const clean = path.replace(/^\//, "");
    if (!clean) continue;
    const parts = clean.split("/");
    let level = root;
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      currentPath += `/${part}`;
      const isLast = i === parts.length - 1;

      if (isLast) {
        if (!level.find((n) => n.path === currentPath && n.type === "file")) {
          level.push({ type: "file", path: currentPath, name: part });
        }
      } else {
        let folder = level.find(
          (n) => n.type === "folder" && n.path === currentPath,
        ) as Extract<TreeNode, { type: "folder" }> | undefined;
        if (!folder) {
          folder = {
            type: "folder",
            path: currentPath,
            name: part,
            children: [],
          };
          level.push(folder);
        }
        level = folder.children;
      }
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) {
      if (n.type === "folder") sortNodes(n.children);
    }
  };
  sortNodes(root);

  return root;
}

export function useFiles(opts?: { respectVisibleFiles?: boolean }) {
  const { sandpack } = useSandpack();
  const respectVisibleFiles = opts?.respectVisibleFiles ?? true;
  const paths = useMemo(() => {
    const all = Object.keys(sandpack.files).filter(
      (p) => !sandpack.files[p]?.hidden,
    );
    if (!respectVisibleFiles) return all;
    const visibleFromProps = sandpack.visibleFilesFromProps ?? [];
    if (visibleFromProps.length === 0) return all;
    const set = new Set<string>(visibleFromProps);
    return all.filter((p) => set.has(p));
  }, [sandpack.files, sandpack.visibleFilesFromProps, respectVisibleFiles]);
  const tree = useMemo(() => buildTree(paths), [paths]);

  return {
    files: sandpack.files,
    paths,
    tree,
    activeFile: sandpack.activeFile,
    visibleFiles: sandpack.visibleFiles,
    visibleFilesFromProps: sandpack.visibleFilesFromProps,
    addFile: (path: string, content = "") => {
      sandpack.updateFile(path, content);
    },
    renameFile: (oldPath: string, newPath: string) => {
      const file = sandpack.files[oldPath];
      if (!file) return;
      sandpack.updateFile(newPath, file.code);
      sandpack.deleteFile(oldPath);
    },
    deleteFile: (path: string) => {
      sandpack.deleteFile(path);
    },
    deleteFolder: (path: string) => {
      Object.keys(sandpack.files).forEach((p) => {
        if (p === path || p.startsWith(path + "/")) {
          sandpack.deleteFile(p);
        }
      });
    },
    renameFolder: (oldPath: string, newPath: string) => {
      const affected = Object.keys(sandpack.files).filter(
        (p) => p === oldPath || p.startsWith(oldPath + "/"),
      );
      for (const p of affected) {
        const next = p.replace(oldPath, newPath);
        const file = sandpack.files[p];
        if (!file) continue;
        sandpack.updateFile(next, file.code);
        sandpack.deleteFile(p);
      }
    },
    setActive: (path: string) => sandpack.setActiveFile(path),
    updateCode: (path: string, code: string) => sandpack.updateFile(path, code),
  };
}
