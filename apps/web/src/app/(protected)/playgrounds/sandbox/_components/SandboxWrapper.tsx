"use client";

import {
  type SandpackPredefinedTemplate,
  type SandpackProps,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import type { Attachment } from "@tutly/db/browser";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { useBundlerUrl } from "@/hooks/use-bundler-url";

import { InstructorModeProvider } from "./instructorMode";
import { SandboxEmbed } from "./SandboxEmbed";
import { SandboxHeader } from "./SandboxHeader";
import { TUTLY_CONFIG_PATH, buildTutlyConfigContent } from "./tutlyConfigFile";

interface SandboxWrapperProps {
  template: string;
  templateName: string;
  canEditTemplate: boolean;
  isEditingTemplate: boolean;
  assignmentId?: string | null;
  assignment: Attachment | null;
  currentUser?: any;
}

export function SandboxWrapper({
  template,
  templateName,
  canEditTemplate,
  isEditingTemplate,
  assignmentId,
  assignment,
  currentUser,
}: SandboxWrapperProps) {
  const bundlerUrl = useBundlerUrl();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const sandpackTheme = resolvedTheme === "dark" ? "dark" : "light";

  // Instructor editing template + free playground always see the explorer.
  // Students respect options.showFileExplorer in tutly.json (defaults to off).
  const templateOptions = (assignment?.sandboxTemplate as SandpackProps | null)
    ?.options as { showFileExplorer?: boolean } | undefined;
  const fileExplorer =
    (canEditTemplate && isEditingTemplate) ||
    !assignment ||
    templateOptions?.showFileExplorer === true;
  const config = {
    fileExplorer,
    closableTabs: !assignment,
    restrictFiles: !fileExplorer,
  };

  const baseTemplate: SandpackProps = useMemo(
    () => ({
      template: template as SandpackPredefinedTemplate,
      options: {
        closableTabs: config.closableTabs,
        readOnly: false,
        showTabs: true,
        showLineNumbers: true,
        showInlineErrors: true,
        wrapContent: true,
        showRefreshButton: true,
        showConsoleButton: true,
        showConsole: false,
        bundlerURL: bundlerUrl,
        editableFiles: [] as string[],
      } as any,
    }),
    [template, config.closableTabs, bundlerUrl],
  );

  const initialSavedTemplate =
    assignment?.sandboxTemplate as SandpackProps | null;

  const [currentConfig, setCurrentConfig] = useState<SandpackProps>(
    initialSavedTemplate || baseTemplate,
  );

  const handleConfigUpdate = (newConfig: SandpackProps) => {
    setCurrentConfig(newConfig);
  };

  // Inject /tutly.json so instructors edit template config as a file.
  const showInstructorConfig = canEditTemplate && isEditingTemplate;
  const filesForSandpack = useMemo(() => {
    const base = (currentConfig.files ?? {}) as Record<string, unknown>;
    if (!showInstructorConfig) return base;
    return {
      ...base,
      [TUTLY_CONFIG_PATH]: { code: buildTutlyConfigContent(currentConfig) },
    };
  }, [currentConfig, showInstructorConfig]);

  const sandpackProps: SandpackProps = {
    ...currentConfig,
    files: filesForSandpack as SandpackProps["files"],
    theme: sandpackTheme,
  };

  const editableFilesFromTemplate = (
    currentConfig.options as unknown as { editableFiles?: unknown }
  )?.editableFiles as string[] | undefined;

  if (!mounted) return null;

  return (
    <InstructorModeProvider value={showInstructorConfig}>
      <SandpackProvider
        key={sandpackTheme}
        {...sandpackProps}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          width: "100%",
        }}
      >
        <SandboxHeader
          assignmentId={assignmentId ?? null}
          template={template}
          templateName={templateName}
          isEditTemplate={canEditTemplate}
          isEditingTemplate={isEditingTemplate}
          currentUser={currentUser}
          savedTemplate={currentConfig}
          onConfigUpdate={handleConfigUpdate}
        />
        <div className="min-h-0 w-full flex-1 overflow-hidden">
          <SandboxEmbed
            assignment={assignment}
            isEditTemplate={canEditTemplate}
            template={template}
            config={config}
            editableFiles={editableFilesFromTemplate}
          />
        </div>
      </SandpackProvider>
    </InstructorModeProvider>
  );
}
