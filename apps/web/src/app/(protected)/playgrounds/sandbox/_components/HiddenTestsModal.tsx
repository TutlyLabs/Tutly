"use client";

import { useEffect, useState } from "react";
import { Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@tutly/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@tutly/ui/dialog";
import { Input } from "@tutly/ui/input";

import { api } from "@/trpc/react";

const DEFAULT_NEW_FILE = "__hidden__/secret.test.ts";

const STARTER = `import { describe, expect, test } from "@jest/globals";

// Students cannot see this file. Write assertions that exercise edge cases.
describe("hidden", () => {
  test("placeholder", () => {
    expect(true).toBe(true);
  });
});
`;

export function HiddenTestsModal({
  assignmentId,
  open,
  onOpenChange,
}: {
  assignmentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = api.useUtils();
  const query = api.attachments.getHiddenTests.useQuery(
    { assignmentId },
    { enabled: open },
  );

  const [files, setFiles] = useState<Record<string, string>>({});
  const [activePath, setActivePath] = useState<string | null>(null);
  const [newPath, setNewPath] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (open && query.data?.success && query.data.data) {
      setFiles(query.data.data);
      const first = Object.keys(query.data.data)[0];
      setActivePath(first ?? null);
      setDirty(false);
    }
  }, [open, query.data]);

  const save = api.attachments.updateHiddenTests.useMutation({
    onSuccess: () => {
      toast.success("Hidden tests saved");
      setDirty(false);
      void utils.attachments.getHiddenTests.invalidate({ assignmentId });
    },
    onError: (err) => toast.error(err.message ?? "Failed to save"),
  });

  const handleAdd = () => {
    const candidate = (newPath.trim() || DEFAULT_NEW_FILE).replace(/^\/+/, "");
    if (!candidate.match(/\.(test|spec)\.[tj]sx?$/)) {
      toast.error("Hidden test files must end with .test.ts/.spec.ts");
      return;
    }
    if (!candidate.startsWith("__hidden__/")) {
      toast.error("Path must start with __hidden__/");
      return;
    }
    if (files[candidate]) {
      toast.error("File already exists");
      return;
    }
    setFiles((prev) => ({ ...prev, [candidate]: STARTER }));
    setActivePath(candidate);
    setNewPath("");
    setDirty(true);
  };

  const handleRemove = (path: string) => {
    if (!confirm(`Delete ${path}?`)) return;
    setFiles((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setActivePath((current) => (current === path ? null : current));
    setDirty(true);
  };

  const handleChange = (value: string) => {
    if (!activePath) return;
    setFiles((prev) => ({ ...prev, [activePath]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    save.mutate({ assignmentId, hiddenTestFiles: files });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] min-w-[70vw] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-600" />
            Hidden Tests
          </DialogTitle>
          <DialogDescription>
            These files run on the server when a student submits and contribute
            to the auto score. Students never see their names or source. Paths
            must start with <code className="text-xs">__hidden__/</code> and end
            with <code className="text-xs">.test.ts</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[220px_1fr] gap-3 overflow-hidden">
          <aside className="border-border/60 flex flex-col gap-2 rounded-md border bg-amber-500/5 p-2">
            <ul className="flex-1 space-y-1 overflow-y-auto">
              {Object.keys(files).length === 0 && (
                <li className="text-muted-foreground px-2 py-3 text-center text-xs">
                  No hidden tests yet
                </li>
              )}
              {Object.keys(files).map((path) => (
                <li
                  key={path}
                  className={`group flex items-center justify-between rounded px-2 py-1 text-xs ${
                    path === activePath
                      ? "bg-amber-500/15 font-medium"
                      : "hover:bg-amber-500/10"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActivePath(path)}
                    className="flex-1 truncate text-left"
                    title={path}
                  >
                    {path.replace(/^__hidden__\//, "")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(path)}
                    className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-rose-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-1">
              <Input
                placeholder={DEFAULT_NEW_FILE}
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                className="h-7 text-xs"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleAdd}
                className="h-7 w-7"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </aside>

          <div className="flex h-[55vh] flex-col">
            {activePath ? (
              <>
                <div className="border-border/60 bg-muted/40 flex items-center justify-between rounded-t-md border border-b-0 px-3 py-1.5 text-xs">
                  <span className="font-mono">{activePath}</span>
                  <span className="text-muted-foreground">
                    read-only for students
                  </span>
                </div>
                <textarea
                  value={files[activePath] ?? ""}
                  onChange={(e) => handleChange(e.target.value)}
                  spellCheck={false}
                  className="border-border/60 bg-background h-full w-full resize-none rounded-b-md border p-3 font-mono text-xs leading-relaxed focus-visible:outline-none"
                />
              </>
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                Select or add a hidden test file
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={!dirty || save.isPending}>
            {save.isPending ? "Saving…" : "Save hidden tests"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
