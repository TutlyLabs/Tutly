"use client";

import { useState } from "react";
import { Plus, Trash2, Link2 } from "lucide-react";
import { Button } from "@tutly/ui/button";
import { Input } from "@tutly/ui/input";
import { Textarea } from "@tutly/ui/textarea";

export type ProjectItem = {
  title: string;
  description: string;
  url: string;
  techStack: string[];
};

interface ProjectsEditorProps {
  initial?: ProjectItem[];
  onSave: (projects: ProjectItem[]) => Promise<void> | void;
  isSaving?: boolean;
  hideHeader?: boolean;
}

export function ProjectsEditor({
  initial = [],
  onSave,
  isSaving = false,
  hideHeader = false,
}: ProjectsEditorProps) {
  const [projects, setProjects] = useState<ProjectItem[]>(
    initial.length > 0
      ? initial
      : [{ title: "", description: "", url: "", techStack: [] }],
  );

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div>
          <h3 className="text-foreground mb-1 text-sm font-semibold">
            Portfolio Projects
          </h3>
          <p className="text-muted-foreground mb-3 text-xs">
            Showcase your work. Projects appear on your public profile.
          </p>
        </div>
      )}

      {projects.map((proj, i) => (
        <div key={i} className="bg-accent/20 space-y-3 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-foreground text-sm font-medium">
              Project {i + 1}
            </h4>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive h-7 w-7"
              onClick={() =>
                setProjects((prev) => prev.filter((_, j) => j !== i))
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input
            placeholder="Project title *"
            value={proj.title}
            onChange={(e) =>
              setProjects((prev) =>
                prev.map((p, j) =>
                  j === i ? { ...p, title: e.target.value } : p,
                ),
              )
            }
          />
          <Textarea
            placeholder="Brief description"
            rows={2}
            className="resize-none text-sm"
            value={proj.description}
            onChange={(e) =>
              setProjects((prev) =>
                prev.map((p, j) =>
                  j === i ? { ...p, description: e.target.value } : p,
                ),
              )
            }
          />
          <div className="relative">
            <Link2 className="text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5" />
            <Input
              placeholder="Project URL (optional)"
              className="pl-8 text-sm"
              value={proj.url}
              onChange={(e) =>
                setProjects((prev) =>
                  prev.map((p, j) =>
                    j === i ? { ...p, url: e.target.value } : p,
                  ),
                )
              }
            />
          </div>
          <Input
            placeholder="Tech stack (comma separated, e.g. React, Node.js)"
            value={proj.techStack.join(", ")}
            onChange={(e) =>
              setProjects((prev) =>
                prev.map((p, j) =>
                  j === i
                    ? {
                        ...p,
                        techStack: e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      }
                    : p,
                ),
              )
            }
          />
        </div>
      ))}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={projects.length >= 10}
          onClick={() =>
            setProjects((prev) => [
              ...prev,
              { title: "", description: "", url: "", techStack: [] },
            ])
          }
        >
          <Plus className="h-3.5 w-3.5" />
          Add Project
        </Button>
        <Button
          size="sm"
          onClick={() =>
            void onSave(projects.filter((p) => p.title.trim().length > 0))
          }
          disabled={isSaving}
        >
          {isSaving ? "Saving…" : "Save Projects"}
        </Button>
      </div>
    </div>
  );
}
