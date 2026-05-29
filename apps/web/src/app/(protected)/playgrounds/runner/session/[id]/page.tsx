"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@tutly/ui/button";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";

import RunnerEditor from "../../_components/Editor";
import FileTree from "../../_components/FileTree";
import { RunnerClient } from "../../_components/RunnerClient";
import RunnerTerminal from "../../_components/Terminal";

export default function RunnerSessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const runnerId = params.id;

  const runnerQuery = api.playground.runners.status.useQuery(
    { id: runnerId },
    { refetchInterval: 5000 }
  );

  const openTicket = api.playground.sessions.openTicket.useMutation();
  const revoke = api.playground.runners.revoke.useMutation();

  const clientRef = useRef<RunnerClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [connError, setConnError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const ticket = await openTicket.mutateAsync({ runnerId });
        if (disposed) return;
        const client = new RunnerClient();
        client.onOpen = () => setConnected(true);
        client.onClose = () => setConnected(false);
        await client.connect(ticket.wsUrl, ticket.ticket);
        if (disposed) {
          client.close();
          return;
        }
        clientRef.current = client;
      } catch (err) {
        if (!disposed) {
          setConnError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      disposed = true;
      clientRef.current?.close();
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runnerId]);

  const stop = async () => {
    if (!confirm("Stop this runner? Your container will keep running until you docker stop it.")) return;
    await revoke.mutateAsync({ id: runnerId });
    router.push("/playgrounds/runner");
  };

  const headerLabel = useMemo(() => {
    if (!runnerQuery.data) return "…";
    return `${runnerQuery.data.image ?? "runner"} · ${runnerQuery.data.status}`;
  }, [runnerQuery.data]);

  if (runnerQuery.isLoading) return <PageLoader />;
  if (!runnerQuery.data) {
    return <div className="p-6">Runner not found.</div>;
  }

  return (
    <div className="bg-background flex h-[calc(100vh-4rem)] flex-col">
      <div className="bg-card flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
            }`}
          />
          <span className="text-foreground font-mono text-xs">{headerLabel}</span>
        </div>
        <Button size="sm" variant="destructive" onClick={() => void stop()}>
          Stop runner
        </Button>
      </div>

      {connError && (
        <div className="bg-destructive/10 text-destructive border-b px-4 py-2 text-xs">
          {connError}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 border-r">
          {clientRef.current && connected ? (
            <FileTree
              client={clientRef.current}
              activePath={activePath}
              onSelect={setActivePath}
            />
          ) : (
            <div className="text-muted-foreground p-3 text-xs">
              Connecting…
            </div>
          )}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            {clientRef.current && connected ? (
              <RunnerEditor client={clientRef.current} path={activePath} />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                Waiting for the broker connection…
              </div>
            )}
          </div>
          <div className="h-72 shrink-0 border-t bg-black">
            {clientRef.current && connected && (
              <RunnerTerminal client={clientRef.current} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
