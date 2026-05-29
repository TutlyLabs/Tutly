import path from "node:path";

export class PathOutsideWorkspaceError extends Error {
  constructor(p: string) {
    super(`path outside workspace: ${p}`);
    this.name = "PathOutsideWorkspaceError";
  }
}

export function safeJoin(workspace: string, p: string): string {
  const root = path.resolve(workspace);
  const target = path.resolve(root, p.startsWith("/") ? p.slice(1) : p);
  const rel = path.relative(root, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new PathOutsideWorkspaceError(p);
  }
  return target;
}
