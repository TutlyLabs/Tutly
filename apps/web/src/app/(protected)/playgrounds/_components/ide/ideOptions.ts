"use client";

import { createContext, useContext } from "react";

export const ClosableTabsContext = createContext<boolean>(true);

export type EditableScope = {
  // When set, only these paths are writable.
  allowList?: string[] | null;
  // When set (and no allowList), these paths are read-only; rest is writable.
  templatePaths?: string[] | null;
  // Used as zip export filename.
  projectName?: string;
};

export const EditableScopeContext = createContext<EditableScope>({});

export function isPathWritable(
  path: string,
  scope: EditableScope,
  sandpackReadOnly?: boolean,
) {
  if (sandpackReadOnly) return false;
  if (scope.allowList) return scope.allowList.includes(path);
  if (scope.templatePaths) return !scope.templatePaths.includes(path);
  return true;
}

export function useIsPathWritable(path: string, sandpackReadOnly?: boolean) {
  const scope = useContext(EditableScopeContext);
  return isPathWritable(path, scope, sandpackReadOnly);
}
