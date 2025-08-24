"use client";

import {
  type SandpackFiles,
  type SandpackPredefinedTemplate,
  type SandpackProps,
  type SandpackSetup,
  useSandpack,
} from "@codesandbox/sandpack-react";
import Editor from "@monaco-editor/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { SANDBOX_TEMPLATES } from "./templetes";

interface SandboxSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: SandpackProps) => void;
  savedTemplate: SandpackProps;
}

// Utility functions based on Sandpack utilities
const normalizePath = (filePath?: string | string[]): string | string[] => {
  if (!filePath) return filePath as any;
  if (Array.isArray(filePath)) {
    return filePath.map((path) => (path.startsWith("/") ? path : `/${path}`));
  }
  return filePath.startsWith("/") ? filePath : `/${filePath}`;
};

const convertedFilesToBundlerFiles = (files?: SandpackFiles) => {
  if (!files) return {};
  return Object.keys(files).reduce((acc: any, key) => {
    if (typeof files[key] === "string") {
      acc[key] = { code: files[key] as string };
    } else {
      acc[key] = files[key];
    }
    return acc;
  }, {});
};

const combineTemplateFilesToSetup = ({
  files,
  template,
  customSetup,
}: {
  files?: SandpackFiles;
  template?: SandpackPredefinedTemplate | undefined;
  customSetup?: SandpackSetup | undefined;
}) => {
  if (!template) {
    // If not input, default to vanilla
    if (!customSetup) {
      const defaultTemplate = SANDBOX_TEMPLATES.vanilla as any;

      return {
        ...defaultTemplate,
        files: {
          ...defaultTemplate.files,
          ...convertedFilesToBundlerFiles(files),
        },
      };
    }

    if (!files || Object.keys(files).length === 0) {
      throw new Error(
        `[sandpack-react]: without a template, you must pass at least one file`,
      );
    }

    // If not template specified, use the setup entirely
    return {
      ...customSetup,
      files: convertedFilesToBundlerFiles(files),
    };
  }

  const baseTemplate = SANDBOX_TEMPLATES[template] as any;
  if (!baseTemplate) {
    throw new Error(
      `[sandpack-react]: invalid template "${template}" provided`,
    );
  }

  // If no setup and not files, the template is used entirely
  if (!customSetup && !files) {
    return baseTemplate;
  }

  // Merge the setup on top of the template
  return {
    /**
     * The input setup might have files in the simple form Record<string, string>
     * so we convert them to the sandbox template format
     */
    files: convertedFilesToBundlerFiles({ ...baseTemplate.files, ...files }),
    /**
     * Merge template dependencies and user custom dependencies.
     * As a rule, the custom dependencies must overwrite the template ones.
     */
    dependencies: {
      ...baseTemplate.dependencies,
      ...customSetup?.dependencies,
    },
    devDependencies: {
      ...baseTemplate.devDependencies,
      ...customSetup?.devDependencies,
    },
    entry: normalizePath(customSetup?.entry as string) || baseTemplate.entry,
    main: baseTemplate.main,
    environment: customSetup?.environment || baseTemplate.environment,
  };
};

export function SandboxSettingsModal({
  isOpen,
  onClose,
  onSave,
  savedTemplate,
}: SandboxSettingsModalProps) {
  const { sandpack } = useSandpack();
  const [config, setConfig] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Use combineTemplateFilesToSetup to get proper template configuration
      const templateSetup = combineTemplateFilesToSetup({
        files: sandpack.files,
        template: savedTemplate.template ?? undefined,
        customSetup: savedTemplate.customSetup ?? undefined,
      });

      // Create enhanced template with actual template dependencies and configuration
      const enhancedTemplate: SandpackProps = {
        ...savedTemplate,
        // Append current files from Sandpack state
        files: sandpack.files,
        // Use proper customSetup from template
        customSetup: {
          dependencies: templateSetup.dependencies || {},
          devDependencies: templateSetup.devDependencies || {},
          ...(templateSetup.entry && { entry: templateSetup.entry }),
          ...(templateSetup.environment && {
            environment: templateSetup.environment,
          }),
          // Preserve any additional custom setup properties
          ...savedTemplate.customSetup,
        },
        // Update options with current runtime state
        options: {
          ...savedTemplate.options,
          activeFile: sandpack.activeFile,
          visibleFiles: sandpack.visibleFiles,
        },
      };

      setConfig(JSON.stringify(enhancedTemplate, null, 2));
      setIsValid(true);
      setHasChanges(false);
    }
  }, [
    isOpen,
    savedTemplate,
    sandpack.files,
    sandpack.activeFile,
    sandpack.visibleFiles,
  ]);

  const handleConfigChange = (value: string | undefined) => {
    const newValue = value || "";
    setConfig(newValue);
    setHasChanges(true);

    // Validate JSON in real-time
    try {
      if (newValue.trim()) {
        JSON.parse(newValue);
        setIsValid(true);
      } else {
        setIsValid(false);
      }
    } catch (error) {
      setIsValid(false);
    }
  };

  const handleSave = () => {
    if (!isValid) {
      toast.error("Please fix JSON syntax errors before saving");
      return;
    }

    try {
      const parsedConfig = JSON.parse(config) as SandpackProps;
      onSave(parsedConfig);
      onClose();
      toast.success("Configuration applied successfully!");
    } catch (error) {
      toast.error("Invalid JSON configuration");
    }
  };

  const handleReset = () => {
    // Reset to enhanced template with proper template setup
    const templateSetup = combineTemplateFilesToSetup({
      files: sandpack.files,
      template: savedTemplate.template ?? undefined,
      customSetup: savedTemplate.customSetup ?? undefined,
    });

    const enhancedTemplate: SandpackProps = {
      ...savedTemplate,
      files: sandpack.files,
      customSetup: {
        dependencies: templateSetup.dependencies || {},
        devDependencies: templateSetup.devDependencies || {},
        ...(templateSetup.entry && { entry: templateSetup.entry }),
        ...(templateSetup.environment && {
          environment: templateSetup.environment,
        }),
        ...savedTemplate.customSetup,
      },
      options: {
        ...savedTemplate.options,
        activeFile: sandpack.activeFile,
        visibleFiles: sandpack.visibleFiles,
      },
    };
    setConfig(JSON.stringify(enhancedTemplate, null, 2));
    setIsValid(true);
    setHasChanges(false);
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to close?",
      );
      if (!confirmed) return;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="flex h-[80vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>Sandpack Configuration Editor</DialogTitle>
          <DialogDescription>
            Edit the complete Sandpack configuration with actual template
            dependencies, devDependencies, entry, and environment. This includes
            the current files and runtime state from the sandbox based on the
            selected template.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden rounded-md border">
          <Editor
            width="100%"
            height="100%"
            language="json"
            theme="vs-dark"
            value={config}
            onChange={handleConfigChange}
            options={{
              automaticLayout: true,
              minimap: { enabled: false },
              lineNumbers: "on",
              wordWrap: "on",
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        {!isValid && (
          <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">
            ⚠️ Invalid JSON format. Please fix syntax errors before saving.
          </div>
        )}

        {hasChanges && isValid && (
          <div className="rounded border border-blue-200 bg-blue-50 p-2 text-sm text-blue-600">
            📝 You have unsaved changes. Configuration includes actual template
            dependencies and current sandbox state.
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            Reset to Template Setup
          </Button>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || !hasChanges}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            Apply Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
