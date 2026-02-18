"use client";

import {
  type SandpackPredefinedTemplate,
  type SandpackProps,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import type { Attachment } from "@/lib/prisma";
import { useMemo, useState } from "react";
import { useBundlerUrl } from "@/hooks/use-bundler-url";

import { SandboxEmbed } from "./SandboxEmbed";
import { SandboxHeader } from "./SandboxHeader";
import { glassyTheme } from "./theme";

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
  const config = {
    fileExplorer: !assignment || (canEditTemplate && isEditingTemplate),
    closableTabs: !assignment,
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
      },
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

  const sandpackProps: SandpackProps = {
    ...currentConfig,
    theme: glassyTheme,
  };

  return (
    <SandpackProvider {...sandpackProps}>
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
      <div className="h-full w-full flex-1 overflow-hidden">
        <SandboxEmbed
          assignment={assignment}
          isEditTemplate={canEditTemplate}
          config={config}
        />
      </div>
    </SandpackProvider>
  );
}
