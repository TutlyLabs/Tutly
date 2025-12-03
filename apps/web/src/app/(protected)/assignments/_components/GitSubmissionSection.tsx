"use client";

import { useState, useEffect } from "react";
import { FiRefreshCw, FiTerminal } from "react-icons/fi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const GitSubmissionSection = ({ assignment }: { assignment: any }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [hasTemplateRepo, setHasTemplateRepo] = useState(false);
  const [repoData, setRepoData] = useState<{
    repoUrl: string;
    expiresAt?: Date;
    lastUpdated?: Date;
    id?: string;
  } | null>(null);

  useEffect(() => {
    const loadExistingRepo = async () => {
      try {
        // Check if template repo exists
        const templateResponse = await fetch(
          `/api/git/create?assignmentId=${assignment.id}&type=TEMPLATE`,
        );
        const templateData = await templateResponse.json();
        setHasTemplateRepo(templateData.exists && !!templateData.repoUrl);

        // Load student's submission repo
        const response = await fetch(
          `/api/git/create?assignmentId=${assignment.id}&type=SUBMISSION`,
        );
        const data = await response.json();
        if (data.exists && data.repoUrl) {
          setRepoData({
            repoUrl: data.repoUrl,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
            lastUpdated: data.lastUpdated
              ? new Date(data.lastUpdated)
              : undefined,
            id: data.submissionId,
          });
        }
      } catch (error) {
        console.error("Error loading existing repo:", error);
      }
    };
    loadExistingRepo();
  }, [assignment.id]);

  const createSubmissionRepo = async () => {
    if (!hasTemplateRepo) {
      toast.error("Assignment not configured. Please contact your instructor.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/git/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SUBMISSION",
          assignmentId: assignment.id,
        }),
      });

      const data = await response.json();
      if (data.success || data.repoUrl) {
        setRepoData({
          repoUrl: data.repoUrl,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
          lastUpdated: new Date(),
          id: data.submissionId,
        });
        toast.success(
          repoData ? "Workspace refreshed!" : "Workspace initialized!",
        );
      } else {
        toast.error(data.error || "Failed to initialize workspace");
      }
    } catch (error) {
      toast.error("Error initializing workspace");
    } finally {
      setIsCreating(false);
    }
  };

  const button = (
    <Button
      onClick={createSubmissionRepo}
      disabled={isCreating || !hasTemplateRepo}
      size="sm"
      className="h-9 cursor-pointer border-transparent bg-blue-600 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isCreating ? (
        <FiRefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
      ) : (
        <FiTerminal className="mr-2 h-3.5 w-3.5" />
      )}
      Initialize Workspace
    </Button>
  );

  return (
    <div className="flex flex-col items-start gap-2">
      {!repoData ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">{button}</span>
            </TooltipTrigger>
            {!hasTemplateRepo && (
              <TooltipContent>
                <p className="max-w-xs text-sm">
                  Assignment not yet configured. Please reach out to your
                  instructor or administrator for assistance.
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
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
        </div>
      )}
    </div>
  );
};
