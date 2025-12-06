"use client";

import {
  type SandpackFiles,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { type submissionMode } from "@/lib/prisma";
import { useMemo } from "react";

import NoDataFound from "@/components/NoDataFound";
import { SandboxEmbed } from "../../playgrounds/sandbox/_components/SandboxEmbed";
import "../../playgrounds/sandbox/_components/styles.css";
import { glassyTheme } from "../../playgrounds/sandbox/_components/theme";

import EvaluateSubmission from "./evaluateSubmission";

function SubmissionSandbox({
  files,
  assignment,
}: {
  files: SandpackFiles;
  assignment?: any;
}) {
  const config = {
    fileExplorer: false,
    closableTabs: false,
  };

  const sandpackProps = useMemo(() => {
    return {
      ...assignment?.sandboxTemplate,
      theme: glassyTheme,
      options: {
        ...assignment?.sandboxTemplate?.options,
        readOnly: true,
      },
      files,
    };
  }, [files, assignment]);

  if (!sandpackProps) {
    return <NoDataFound message="No sandbox template found" />;
  }

  return (
    <SandpackProvider {...sandpackProps}>
      <div className="h-full w-full">
        <SandboxEmbed
          assignment={null}
          isEditTemplate={false}
          config={config}
        />
      </div>
    </SandpackProvider>
  );
}

const PlaygroundPage = ({
  submission,
  assignment,
  showActions = false,
  showAssignment = false,
}: {
  submission: any;
  submissionMode: submissionMode;
  assignment?: any;
  showActions?: boolean;
  showAssignment?: boolean;
}) => {
  if (!submission) return <NoDataFound message="No submission found" />;

  return (
    <div className="flex h-screen flex-col">
      <EvaluateSubmission submission={submission} showActions={showActions} />
      <div className="flex-1 overflow-hidden">
        {submission.assignment.submissionMode === "EXTERNAL_LINK" ? (
          <iframe
            src={submission.submissionLink ?? ""}
            allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
            className="h-full w-full"
          />
        ) : (
          <SubmissionSandbox
            assignment={
              assignment || (showAssignment ? submission.assignment : null)
            }
            files={submission.data as SandpackFiles}
          />
        )}
      </div>
    </div>
  );
};

export default PlaygroundPage;
