"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@tutly/ui/button";
import { Card } from "@tutly/ui/card";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";

export default function RunnerLaunchPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const defQuery = api.playground.definitions.get.useQuery({ slug });
  const requestToken = api.playground.runners.requestToken.useMutation();

  const [runnerId, setRunnerId] = useState<string | null>(null);
  const [dockerCommand, setDockerCommand] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const statusQuery = api.playground.runners.status.useQuery(
    { id: runnerId ?? "" },
    {
      enabled: !!runnerId,
      refetchInterval: 2000,
    }
  );

  useEffect(() => {
    if (statusQuery.data?.status === "ONLINE") {
      router.push(`/playgrounds/runner/session/${runnerId}`);
    }
  }, [statusQuery.data?.status, runnerId, router]);

  const mint = async () => {
    if (!defQuery.data) return;
    const res = await requestToken.mutateAsync({ definitionId: defQuery.data.id });
    setRunnerId(res.runnerId);
    setDockerCommand(res.dockerCommand);
  };

  const copy = async () => {
    if (!dockerCommand) return;
    await navigator.clipboard.writeText(dockerCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const statusLabel = useMemo(() => {
    if (!runnerId) return null;
    switch (statusQuery.data?.status) {
      case "ONLINE":
        return "Online — opening IDE…";
      case "OFFLINE":
        return "Disconnected — re-run the command if needed.";
      case "REVOKED":
        return "Revoked.";
      default:
        return "Waiting for your container to dial home…";
    }
  }, [statusQuery.data?.status, runnerId]);

  if (defQuery.isLoading) return <PageLoader />;
  if (!defQuery.data) return <div className="p-6">Playground not found.</div>;
  const def = defQuery.data;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          Runner playground
        </p>
        <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          {def.name}
        </h1>
        {def.description && (
          <p className="text-muted-foreground mt-1 text-sm">{def.description}</p>
        )}
      </div>

      {!dockerCommand && (
        <Card className="p-5">
          <h2 className="text-foreground text-base font-semibold">
            Prepare your machine
          </h2>
          <ol className="text-muted-foreground mt-3 list-decimal space-y-2 pl-5 text-sm">
            <li>Install Docker on a machine that can reach the internet.</li>
            <li>Click <em>Start</em>. Tutly will give you one command to run.</li>
            <li>
              Paste it into a terminal on that machine. The container will dial
              Tutly automatically.
            </li>
          </ol>
          <div className="mt-4">
            <Button onClick={mint} disabled={requestToken.isPending}>
              {requestToken.isPending ? "Preparing…" : "Start"}
            </Button>
          </div>
        </Card>
      )}

      {dockerCommand && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-base font-semibold">
              Run this on your machine
            </h2>
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <pre className="bg-muted text-foreground mt-3 overflow-x-auto rounded-md p-3 font-mono text-xs leading-relaxed">
            {dockerCommand}
          </pre>
          <div className="mt-4 flex items-center gap-3">
            <span
              className={`inline-flex h-2 w-2 rounded-full ${
                statusQuery.data?.status === "ONLINE"
                  ? "bg-emerald-500"
                  : "bg-amber-500 animate-pulse"
              }`}
            />
            <span className="text-muted-foreground text-sm">{statusLabel}</span>
          </div>
          <p className="text-muted-foreground/80 mt-3 text-xs">
            The token in the command is one-time. Once your container connects,
            your IDE will open automatically.
          </p>
        </Card>
      )}
    </div>
  );
}
