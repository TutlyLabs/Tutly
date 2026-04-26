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
      <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-red-500/10 p-4">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">Unauthorized Access</h1>
          <p className="text-zinc-400">
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
