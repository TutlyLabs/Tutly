"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  Globe,
  Sparkles,
  ExternalLink,
  FileCode2,
  Terminal,
  GitBranch,
  Code2,
  Search,
} from "lucide-react";

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
import { Skeleton } from "@tutly/ui/skeleton";
import { cn } from "@tutly/utils";
import { api } from "@/trpc/react";

const MODE_META: Record<
  string,
  {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    bg: string;
    text: string;
    ring: string;
  }
> = {
  HTML_CSS_JS: {
    label: "HTML / CSS / JS",
    Icon: Globe,
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    ring: "ring-orange-500/20",
  },
  REACT: {
    label: "React",
    Icon: Sparkles,
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    ring: "ring-sky-500/20",
  },
  EXTERNAL_LINK: {
    label: "External link",
    Icon: ExternalLink,
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-500/20",
  },
  SANDBOX: {
    label: "Sandbox",
    Icon: FileCode2,
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/20",
  },
  WORKSPACE: {
    label: "Workspace",
    Icon: Terminal,
    bg: "bg-indigo-500/10",
    text: "text-indigo-600 dark:text-indigo-400",
    ring: "ring-indigo-500/20",
  },
  GIT: {
    label: "Git",
    Icon: GitBranch,
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    ring: "ring-rose-500/20",
  },
};

function getModeMeta(mode?: string) {
  if (mode && mode in MODE_META) return MODE_META[mode]!;
  return {
    label: "Other",
    Icon: Code2,
    bg: "bg-muted",
    text: "text-muted-foreground",
    ring: "ring-border",
  };
}

interface LinkAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  classId: string;
  onLinked?: () => void;
}

export default function LinkAssignmentDialog({
  open,
  onOpenChange,
  courseId,
  classId,
  onLinked,
}: LinkAssignmentDialogProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const utils = api.useUtils();
  const { data, isLoading } = api.attachments.getUnlinkedAssignments.useQuery(
    { courseId },
    { enabled: open },
  );

  const linkMutation = api.attachments.linkAssignmentToClass.useMutation({
    onSuccess: (result) => {
      if (result.success !== true) {
        toast.error(
          ("error" in result && result.error) || "Failed to link assignment",
        );
        return;
      }
      toast.success("Assignment linked to this class");
      void utils.attachments.invalidate();
      router.refresh();
      onOpenChange(false);
      setSelectedId(null);
      onLinked?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to link assignment");
    },
  });

  const filtered = useMemo(() => {
    const list = data?.data ?? [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((a) =>
      [a.title, a.course?.title].some((s) =>
        (s ?? "").toLowerCase().includes(q),
      ),
    );
  }, [data, search]);

  const handleLink = () => {
    if (!selectedId) return;
    linkMutation.mutate({
      attachmentId: selectedId,
      classId,
      courseId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link an existing assignment</DialogTitle>
          <DialogDescription>
            Pick a pre-created assignment that isn&apos;t attached to a class
            yet.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="text-muted-foreground/70 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assignments..."
            className="pl-9"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              No unlinked assignments found.
              <div className="mt-1 text-xs">
                Pre-create assignments without a class to use this flow.
              </div>
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {filtered.map((a) => {
                const meta = getModeMeta(a.submissionMode);
                const Icon = meta.Icon;
                const isSelected = selectedId === a.id;
                const dueDate = a.dueDate ? new Date(a.dueDate) : null;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(a.id)}
                      className={cn(
                        "hover:bg-accent/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                        isSelected && "bg-primary/5",
                      )}
                    >
                      <div
                        className="bg-muted/60 text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                        aria-hidden
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-foreground truncate text-sm font-medium">
                          {a.title}
                        </div>
                        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                          <span className={meta.text}>{meta.label}</span>
                          {a.course?.title && (
                            <span className="inline-flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              {a.course.title}
                            </span>
                          )}
                          {dueDate && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {dueDate.toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="text-primary h-5 w-5 shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={linkMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedId || linkMutation.isPending}
          >
            {linkMutation.isPending ? "Linking..." : "Link to class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
