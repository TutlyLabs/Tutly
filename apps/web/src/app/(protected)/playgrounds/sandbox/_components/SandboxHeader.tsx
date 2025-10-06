"use client";

import type { SandpackProps } from "@codesandbox/sandpack-react";
import {
  ArrowLeft,
  Edit,
  Maximize2,
  Minimize2,
  RotateCcw,
  Save,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SubmitAssignment from "@/app/(protected)/playgrounds/_components/SubmitAssignment";
import { templates } from "@/app/(protected)/playgrounds/templetes";
import { api } from "@/trpc/react";

import { SandboxSettingsModal } from "./SandboxSettingsModal";

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
  const [showSettings, setShowSettings] = useState(false);

  // tRPC mutation
  const updateAttachmentMutation =
    api.attachments.updateAttachmentSandboxTemplate.useMutation();

  const handleSaveTemplate = async () => {
    if (!assignmentId) {
      console.error("No assignment ID found");
      return;
    }

    try {
      console.log("Saving template:", savedTemplate);

      const result = await updateAttachmentMutation.mutateAsync({
        id: assignmentId,
        sandboxTemplate: savedTemplate,
      });

      if (result.success) {
        toast.success("Template updated successfully");
      } else {
        toast.error("Failed to save template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  return (
    <>
      {/* Settings Button - Show for everyone */}
      <Button
        variant="ghost"
        onClick={() => setShowSettings(true)}
        className="text-gray-300 hover:text-white"
        title="Sandbox Settings"
      >
        <Settings className="h-4 w-4" />
        Settings
      </Button>

      {/* Save Button - Only for editing templates */}
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

      <SandboxSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={(config) => onConfigUpdate(config)}
        savedTemplate={savedTemplate}
      />
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
