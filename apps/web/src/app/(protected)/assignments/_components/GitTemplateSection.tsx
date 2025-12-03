"use client";

import { useState, useEffect } from "react";
import { FiRefreshCw, FiTerminal } from "react-icons/fi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const GitTemplateSection = ({ assignment }: { assignment: any }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
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

                const config: any = {
                  mode: "fsrelay",
                  assignmentId: assignment.id,
                };

                if (configResponse.ok) {
                  const configData = await configResponse.json();
                  if (configData.success && configData.config) {
                    config.tutlyConfig = configData.config;
                  }
                }

                const encodedConfig = btoa(JSON.stringify(config));
                window.open(`/vscode?config=${encodedConfig}`, "_blank");
              } catch (error) {
                console.error("Error launching playground:", error);
                const config = {
                  mode: "fsrelay",
                  assignmentId: assignment.id,
                };
                const encodedConfig = btoa(JSON.stringify(config));
                window.open(`/vscode?config=${encodedConfig}`, "_blank");
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
