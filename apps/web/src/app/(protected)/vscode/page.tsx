"use client";

import { useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { useAuthSession } from "@/components/auth/ProtectedShell";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import VSCodeEditor from "./vscode-editor";

export default function VSCodePage() {
  const { user } = useAuthSession();
  const searchParams = useSearchParams();
  const config = searchParams.get("config");
  const initialAssignmentId = searchParams.get("assignmentId");

  const cfg = api.vscode.resolveConfig.useQuery(
    { config, assignmentId: initialAssignmentId },
    { enabled: Boolean(user) },
  );

  if (!user || cfg.isLoading) return <PageLoader />;
  if (!cfg.data?.isAuthorized) {
    return (
      <div className="bg-background flex min-h-[calc(100vh-7rem)] w-full flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-destructive/10 flex h-14 w-14 items-center justify-center rounded-2xl">
            <ShieldAlert className="text-destructive h-7 w-7" />
          </div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Unauthorized access
          </h1>
          <p className="text-muted-foreground max-w-sm text-sm">
            The configuration token is invalid or has been tampered with.
          </p>
        </div>
      </div>
    );
  }

  const params = new URLSearchParams();
  searchParams.forEach((v, k) => params.append(k, v));
  const queryString = params.toString();
  const iframeSrc = queryString
    ? `/vscode/index.html?${queryString}`
    : "/vscode/index.html";

  return (
    <VSCodeEditor
      iframeSrc={iframeSrc}
      assignmentId={cfg.data.assignmentId ?? undefined}
      assignmentName={cfg.data.assignment?.title}
      courseName={cfg.data.assignment?.class?.course?.title}
      userName={user.name || user.username}
      userId={user.id}
      hasRunCommand={cfg.data.hasRunCommand}
    />
  );
}
