"use client";

import { useState, useEffect } from "react";
import { FiRefreshCw, FiTerminal, FiLock, FiUnlock } from "react-icons/fi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const GitTemplateSection = ({ assignment }: { assignment: any }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [isPrivate, setIsPrivate] = useState(true);
  const [repoData, setRepoData] = useState<{
    repoUrl: string;
    expiresAt?: Date;
  } | null>(null);

  useEffect(() => {
    const loadExistingRepo = async () => {
      try {
        const response = await fetch(
          `/api/git/create?assignmentId=${assignment.id}&type=TEMPLATE`,
        );
        const data = await response.json();
        if (data.exists && data.repoUrl) {
          setRepoData({
            repoUrl: data.repoUrl,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
          });
        }
      } catch (error) {
        console.error("Error loading existing repo:", error);
      }
    };
    loadExistingRepo();
  }, [assignment.id]);

  const createTemplateRepo = async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/git/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TEMPLATE",
          assignmentId: assignment.id,
        }),
      });

      const data = await response.json();
      if (data.success || data.repoUrl) {
        setRepoData({
          repoUrl: data.repoUrl,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        });
        toast.success("Workspace initialized!");
      } else {
        toast.error(data.error || "Failed to initialize workspace");
      }
    } catch (error) {
      toast.error("Error initializing workspace");
    } finally {
      setIsCreating(false);
    }
  };

  const updateRepoVisibility = async (makePrivate: boolean) => {
    setIsUpdatingVisibility(true);
    try {
      const response = await fetch("/api/git/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TEMPLATE",
          assignmentId: assignment.id,
          private: makePrivate,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsPrivate(makePrivate);
        toast.success(
          `Repository is now ${makePrivate ? "private" : "public"}`,
        );
      } else {
        toast.error(data.error || "Failed to update repository visibility");
      }
    } catch (error) {
      toast.error("Error updating repository visibility");
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      {!repoData ? (
        <Button
          onClick={createTemplateRepo}
          disabled={isCreating}
          size="sm"
          className="h-9 cursor-pointer border-transparent bg-blue-600 text-xs text-white hover:bg-blue-700"
        >
          {isCreating ? (
            <FiRefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <FiTerminal className="mr-2 h-3.5 w-3.5" />
          )}
          Initialize Workspace
        </Button>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            onClick={async () => {
              setIsLaunching(true);
              try {
                const configResponse = await fetch(
                  `/api/config?assignmentId=${assignment.id}`,
                );

                if (configResponse.ok) {
                  const configData = await configResponse.json();
                  if (configData.success && configData.config) {
                    window.open(
                      `/vscode?config=${encodeURIComponent(configData.config)}`,
                      "_blank",
                    );
                    return;
                  }
                }

                throw new Error("Failed to get config");
              } catch (error) {
                console.error("Error launching playground:", error);
                toast.error("Failed to launch playground");
              } finally {
                setIsLaunching(false);
              }
            }}
            disabled={isLaunching}
            size="sm"
            className="h-8 cursor-pointer border-transparent bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLaunching ? (
              <FiRefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FiTerminal className="mr-2 h-3.5 w-3.5" />
            )}
            {isLaunching ? "Loading..." : "Launch Playground"}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs"
              >
                {isPrivate ? (
                  <FiLock className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <FiUnlock className="mr-1.5 h-3.5 w-3.5" />
                )}
                {isPrivate ? "Private" : "Public"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium leading-none">
                    Repository Visibility
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    Control who can see this repository
                  </p>
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex items-center space-x-2">
                    {isPrivate ? (
                      <FiLock className="h-4 w-4" />
                    ) : (
                      <FiUnlock className="h-4 w-4" />
                    )}
                    <span className="text-sm">
                      {isPrivate ? "Private" : "Public"}
                    </span>
                  </div>
                  <Switch
                    checked={!isPrivate}
                    onCheckedChange={(checked) =>
                      updateRepoVisibility(!checked)
                    }
                    disabled={isUpdatingVisibility}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  {isPrivate
                    ? "Only you and collaborators can access this repository."
                    : "Anyone can view this repository."}
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};
