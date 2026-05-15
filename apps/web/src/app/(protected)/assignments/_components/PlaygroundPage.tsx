"use client";

import {
  type SandpackFiles,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { type submissionMode } from "@tutly/db/browser";
import { useMemo } from "react";
import { Download, RefreshCw } from "lucide-react";

import NoDataFound from "@/components/NoDataFound";
import { Button } from "@tutly/ui/button";
import { SandboxEmbed } from "../../playgrounds/sandbox/_components/SandboxEmbed";
import "../../playgrounds/sandbox/_components/styles.css";
import { glassyTheme } from "../../playgrounds/sandbox/_components/theme";
import { useBundlerUrl } from "@/hooks/use-bundler-url";
import { api } from "@/trpc/react";

import EvaluateSubmission from "./evaluateSubmission";

function SubmissionSandbox({
  files,
  assignment,
}: {
  files: SandpackFiles;
  assignment?: any;
}) {
  const bundlerUrl = useBundlerUrl();
  const config = {
    fileExplorer: false,
    closableTabs: false,
    restrictFiles: false,
  };

  const sandpackProps = useMemo(() => {
    return {
      ...assignment?.sandboxTemplate,
      theme: glassyTheme,
      options: {
        ...assignment?.sandboxTemplate?.options,
        readOnly: true,
        bundlerURL: bundlerUrl,
      },
      files,
    };
  }, [files, assignment, bundlerUrl]);

  if (!sandpackProps) {
    return <NoDataFound message="No sandbox template found" />;
  }

  return (
    <SandpackProvider {...sandpackProps}>
      <div className="h-full w-full">
        <SandboxEmbed
          assignment={assignment ?? null}
          isEditTemplate={false}
          config={config}
        />
      </div>
    </SandpackProvider>
  );
}

function WorkspaceSubmissionReview({ submission }: { submission: any }) {
  const downloadArtifact =
    api.submissions.getWorkspaceArtifactDownloadUrl.useMutation();
  const enqueueOfficial = api.testRuns.enqueueOfficial.useMutation();
  const latestSubmissionArtifact = submission.artifacts?.find(
    (artifact: any) => artifact.kind === "SUBMISSION",
  );

  const handleDownload = async () => {
    if (!latestSubmissionArtifact?.id) return;
    const result = await downloadArtifact.mutateAsync({
      artifactId: latestSubmissionArtifact.id,
    });
    if (result.data?.signedUrl) window.open(result.data.signedUrl, "_blank");
  };

  return (
    <div className="bg-background h-full overflow-auto p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-foreground text-lg font-semibold">
            Workspace Submission
          </h2>
          <p className="text-muted-foreground text-sm">
            Review submitted files, visible/hidden test runs, logs, and score
            history.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              enqueueOfficial.mutate({ submissionId: submission.id })
            }
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Rerun official
          </Button>
          <Button onClick={handleDownload} disabled={!latestSubmissionArtifact}>
            <Download className="mr-2 h-4 w-4" />
            Download artifact
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-lg border p-4">
          <h3 className="text-foreground mb-3 text-sm font-semibold">Score</h3>
          <div className="space-y-2 text-sm">
            {submission.points?.map((point: any) => (
              <div key={point.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{point.category}</span>
                <span className="text-foreground font-medium">
                  {point.score}
                  {point.maxScore ? `/${point.maxScore}` : ""}
                </span>
              </div>
            ))}
            {submission.review && (
              <div className="border-border mt-3 border-t pt-3">
                <div className="text-muted-foreground text-xs">
                  Review state
                </div>
                <div className="text-foreground text-sm font-medium">
                  {submission.review.status}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border p-4">
          <h3 className="text-foreground mb-3 text-sm font-semibold">
            Test runs
          </h3>
          <div className="space-y-3">
            {submission.testRuns?.length ? (
              submission.testRuns.map((run: any) => (
                <div key={run.id} className="bg-muted/30 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-foreground text-sm font-medium">
                      {run.trigger} · {run.provider}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {run.status}
                    </div>
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    Visible {run.visiblePassed}/{run.visibleTotal} · Hidden{" "}
                    {run.hiddenPassed}/{run.hiddenTotal} · Score {run.score}/
                    {run.maxScore}
                  </div>
                  {run.outputSummary && (
                    <pre className="bg-background text-muted-foreground mt-3 max-h-48 overflow-auto rounded border p-2 text-xs">
                      {JSON.stringify(run.outputSummary, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground text-sm">
                No test runs yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
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
        {submission.assignment.submissionMode === "WORKSPACE" ? (
          <WorkspaceSubmissionReview submission={submission} />
        ) : submission.assignment.submissionMode === "EXTERNAL_LINK" ? (
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
