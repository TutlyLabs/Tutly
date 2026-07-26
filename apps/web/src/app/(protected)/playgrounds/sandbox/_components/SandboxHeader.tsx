"use client";

import type { SandpackProps } from "@codesandbox/sandpack-react";
import { useSandpack } from "@codesandbox/sandpack-react";
import {
  ArrowLeft,
  Edit,
  Maximize2,
  Minimize2,
  RotateCcw,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@tutly/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tutly/ui/select";
import SubmitAssignment from "@/app/(protected)/playgrounds/_components/SubmitAssignment";
import { templates } from "@/app/(protected)/playgrounds/templetes";
import { api } from "@/trpc/react";

import { TUTLY_CONFIG_PATH, parseTutlyConfig } from "./tutlyConfigFile";

interface SandboxHeaderProps {
  template: string;
  templateName: string;
  isEditTemplate: boolean;
  isEditingTemplate: boolean;
  assignmentId?: string | null;
  currentUser?: any;
  onReset?: () => void;
  savedTemplate: SandpackProps;
  onConfigUpdate: (config: SandpackProps) => void;
}

function SandboxActions({
  assignmentId,
  isEditingTemplate,
  savedTemplate,
  onConfigUpdate,
}: {
  assignmentId: string | null;
  isEditingTemplate: boolean;
  savedTemplate: SandpackProps;
  onConfigUpdate: (config: SandpackProps) => void;
}) {
  const { sandpack } = useSandpack();

  const updateAttachmentMutation =
    api.attachments.updateAttachmentSandboxTemplate.useMutation();

  const handleSaveTemplate = async () => {
    if (!assignmentId) {
      toast.error("No assignment id");
      return;
    }

    const allFiles = { ...sandpack.files } as Record<
      string,
      { code: string } | string
    >;

    // /tutly.json — the instructor's edit surface for template/options/customSetup/fileMeta.
    const tutlyEntry = allFiles[TUTLY_CONFIG_PATH];
    const tutlyRaw =
      typeof tutlyEntry === "string" ? tutlyEntry : (tutlyEntry?.code ?? null);
    delete allFiles[TUTLY_CONFIG_PATH];

    let configOverrides: Record<string, unknown> = {};
    if (tutlyRaw != null) {
      const parsed = parseTutlyConfig(tutlyRaw);
      if (!parsed.ok) {
        toast.error(parsed.error);
        return;
      }
      configOverrides = parsed.config;
    }

    const templateToSave = {
      ...savedTemplate,
      ...configOverrides,
      files: allFiles,
    } as SandpackProps;

    try {
      await updateAttachmentMutation.mutateAsync({
        id: assignmentId,
        sandboxTemplate: templateToSave,
      });
      toast.success("Template saved");
      onConfigUpdate(templateToSave);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save template",
      );
    }
  };

  return (
    <>
      {isEditingTemplate && assignmentId && (
        <Button
          variant="ghost"
          onClick={handleSaveTemplate}
          className="text-gray-300 hover:text-white"
          title="Save Template"
        >
          <Save className="h-4 w-4" />
          Save Template
        </Button>
      )}
    </>
  );
}

export function SandboxHeader({
  template,
  templateName,
  isEditTemplate,
  isEditingTemplate,
  assignmentId,
  currentUser,
  onReset,
  savedTemplate,
  onConfigUpdate,
}: SandboxHeaderProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    const container = document.querySelector(".h-screen");

    if (!document.fullscreenElement) {
      void container?.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  };

  const handleEdit = () => {
    window.open(
      `/playgrounds/sandbox?assignmentId=${assignmentId}&template=${template}&editTemplate=true`,
      "_blank",
    );
  };

  const handleTemplateChange = (newTemplate: string) => {
    const currentUrl = new URL(window.location.href);
    const params = new URLSearchParams(currentUrl.search);
    params.set("template", newTemplate);

    router.push(`${currentUrl.pathname}?${params.toString()}`);
  };

  return (
    <div className="bg-background flex h-10 items-center justify-between px-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-gray-300 hover:text-white"
        >
          <Link href="/playgrounds" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="text-sm font-medium text-white">
          {templateName} Playground
        </div>
      </div>

      <div className="-ml-48 flex items-center gap-2">
        {isEditTemplate && assignmentId && (
          <>
            {isEditingTemplate ? (
              <div className="flex items-center gap-2">
                <Select value={template} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem
                        key={template.template}
                        value={template.template}
                      >
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <SandboxActions
                  assignmentId={assignmentId ?? null}
                  isEditingTemplate={isEditingTemplate}
                  savedTemplate={savedTemplate}
                  onConfigUpdate={onConfigUpdate}
                />
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={handleEdit}
                className="text-gray-300 hover:text-white"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
          </>
        )}

        {assignmentId && !isEditingTemplate && (
          <SubmitAssignment
            currentUser={currentUser}
            assignmentId={assignmentId}
          />
        )}

        {onReset && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            className="text-gray-300 hover:text-white"
            title="Reset to template"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className="text-gray-300 hover:text-white"
          title="Toggle fullscreen"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
