"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Server, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@tutly/ui/button";
import { Input } from "@tutly/ui/input";
import { api } from "@/trpc/react";

export function WorkspaceProvidersIntegration() {
  const utils = api.useUtils();
  const connections = api.serviceConnections.list.useQuery();
  const createConnection = api.serviceConnections.create.useMutation({
    onSuccess: () => utils.serviceConnections.list.invalidate(),
  });
  const testConnection = api.serviceConnections.test.useMutation({
    onSuccess: () => utils.serviceConnections.list.invalidate(),
  });
  const deleteConnection = api.serviceConnections.delete.useMutation({
    onSuccess: () => utils.serviceConnections.list.invalidate(),
  });

  const [form, setForm] = useState({
    name: "Personal SSH runner",
    host: "",
    port: "22",
    username: "",
    workingDirectory: "",
    privateKey: "",
    passphrase: "",
  });

  const save = async () => {
    const result = await createConnection.mutateAsync({
      provider: "SSH",
      name: form.name,
      config: {
        host: form.host,
        port: Number(form.port) || 22,
        username: form.username,
        workingDirectory: form.workingDirectory,
      },
      privateKey: form.privateKey,
      passphrase: form.passphrase || undefined,
    });

    if (result.success) {
      toast.success("SSH runner saved");
      setForm((value) => ({ ...value, privateKey: "", passphrase: "" }));
    } else {
      toast.error(result.message ?? "SSH runner needs attention");
    }
  };

  return (
    <section className="bg-card rounded-lg border p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-foreground flex items-center gap-2 text-base font-semibold">
            <Server className="h-4 w-4" />
            Workspace Providers
          </h2>
          <p className="text-muted-foreground text-sm">
            Add SSH runners for assignments that should not execute on a local
            machine.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="Connection name"
        />
        <Input
          value={form.host}
          onChange={(event) => setForm({ ...form, host: event.target.value })}
          placeholder="ssh.example.com"
        />
        <Input
          value={form.port}
          onChange={(event) => setForm({ ...form, port: event.target.value })}
          placeholder="22"
          type="number"
        />
        <Input
          value={form.username}
          onChange={(event) =>
            setForm({ ...form, username: event.target.value })
          }
          placeholder="Username"
        />
        <Input
          value={form.workingDirectory}
          onChange={(event) =>
            setForm({ ...form, workingDirectory: event.target.value })
          }
          placeholder="/home/user/tutly-workspaces"
          className="md:col-span-2"
        />
        <textarea
          value={form.privateKey}
          onChange={(event) =>
            setForm({ ...form, privateKey: event.target.value })
          }
          placeholder="Private key"
          className="border-input bg-background text-foreground placeholder:text-muted-foreground min-h-28 rounded-md border px-3 py-2 text-sm md:col-span-2"
        />
        <Input
          value={form.passphrase}
          onChange={(event) =>
            setForm({ ...form, passphrase: event.target.value })
          }
          placeholder="Passphrase (optional)"
          type="password"
        />
        <Button
          onClick={save}
          disabled={createConnection.isPending}
          className="md:justify-self-end"
        >
          {createConnection.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Save SSH Provider
        </Button>
      </div>

      <div className="mt-5 space-y-2">
        {connections.data?.data?.map((connection) => (
          <div
            key={connection.id}
            className="border-border flex flex-col gap-3 rounded-md border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="text-foreground flex items-center gap-2 text-sm font-medium">
                {connection.name}
                {connection.status === "ACTIVE" && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
              </div>
              <div className="text-muted-foreground text-xs">
                {connection.provider} ·{" "}
                {String((connection.config as any)?.host ?? "local")}
                {connection.lastError ? ` · ${connection.lastError}` : ""}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnection.mutate({ id: connection.id })}
              >
                Test
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteConnection.mutate({ id: connection.id })}
              >
                <Trash2 className="text-destructive h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
