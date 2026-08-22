"use client";

import { Check, Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@tutly/ui/badge";
import { Button } from "@tutly/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@tutly/ui/dialog";
import { Input } from "@tutly/ui/input";
import { Label } from "@tutly/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tutly/ui/select";
import { authClient } from "@/server/auth/client";

/** Matches the plugin's `maxExpiresIn: 365`. Values are days. */
const EXPIRY_OPTIONS = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "180 days", days: 180 },
  { label: "1 year", days: 365 },
] as const;

const DAY_SECONDS = 24 * 60 * 60;

interface ApiKeyRow {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  enabled: boolean | null;
  createdAt: string | Date;
  expiresAt: string | Date | null;
  lastRequest: string | Date | null;
  requestCount: number | null;
  metadata?: Record<string, unknown> | null;
}

function formatDate(value: string | Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isExpired(key: ApiKeyRow) {
  return Boolean(key.expiresAt && new Date(key.expiresAt) < new Date());
}

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [expiryDays, setExpiryDays] = useState<string>("90");
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Shown exactly once, right after creation. The server only ever stores a
  // hash, so there is no way back to this value.
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const applyList = useCallback(
    (
      result: Awaited<ReturnType<typeof authClient.apiKey.list>>,
      shouldApply: () => boolean,
    ) => {
      if (!shouldApply()) return;
      if (result.error) {
        toast.error(result.error.message ?? "Failed to load API keys");
        setKeys([]);
      } else {
        setKeys((result.data ?? []) as unknown as ApiKeyRow[]);
      }
      setLoading(false);
    },
    [],
  );

  /** Refetch after a mutation. `loading` is already false by then. */
  const refresh = useCallback(async () => {
    applyList(await authClient.apiKey.list(), () => true);
  }, [applyList]);

  // `loading` starts true, so the initial fetch must not set it again — doing so
  // synchronously in the effect body causes a cascading render. The cancel flag
  // keeps a slow response from writing state after unmount.
  useEffect(() => {
    let cancelled = false;
    void authClient.apiKey
      .list()
      .then((result) => applyList(result, () => !cancelled));
    return () => {
      cancelled = true;
    };
  }, [applyList]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    // The plugin is configured with `requireName`, so an empty name is a
    // server-side error; catch it here for a better message.
    if (!trimmed) {
      toast.error("Give the key a name so you can recognise it later");
      return;
    }

    setCreating(true);
    const { data, error } = await authClient.apiKey.create({
      name: trimmed,
      expiresIn: Number(expiryDays) * DAY_SECONDS,
      metadata: { createdVia: "web" },
    });
    setCreating(false);

    if (error) {
      toast.error(error.message ?? "Failed to create API key");
      return;
    }

    setCreateOpen(false);
    setName("");
    setNewKey(data?.key ?? null);
    setCopied(false);
    void refresh();
  };

  const handleRevoke = async (keyId: string, keyName: string | null) => {
    if (
      !window.confirm(
        `Revoke "${keyName ?? "this key"}"? Anything using it stops working immediately.`,
      )
    ) {
      return;
    }

    setRevoking(keyId);
    const { error } = await authClient.apiKey.delete({ keyId });
    setRevoking(null);

    if (error) {
      toast.error(error.message ?? "Failed to revoke API key");
      return;
    }
    toast.success("API key revoked");
    void refresh();
  };

  const copyKey = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy — select the key and copy it manually");
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            API Keys
          </h2>
          <p className="text-muted-foreground text-sm">
            Let the Tutly CLI, an MCP client or your own scripts act as you. A
            key carries your permissions — treat it like a password.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New key
        </Button>
      </div>

      <div className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
        {loading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading keys…
          </div>
        ) : keys.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
            <KeyRound className="h-8 w-8 opacity-40" />
            <p>No API keys yet.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {keys.map((key) => {
              const expired = isExpired(key);
              const disabled = key.enabled === false;
              return (
                <li
                  key={key.id}
                  className="hover:border-primary/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">
                        {key.name ?? "Unnamed key"}
                      </p>
                      {expired && <Badge variant="destructive">Expired</Badge>}
                      {disabled && !expired && (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground font-mono text-xs">
                      {key.start
                        ? `${key.start}…`
                        : (key.prefix ?? "tutly_sk_…")}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Created {formatDate(key.createdAt)} · Expires{" "}
                      {formatDate(key.expiresAt)} · Last used{" "}
                      {formatDate(key.lastRequest)} · {key.requestCount ?? 0}{" "}
                      requests
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={revoking === key.id}
                    onClick={() => void handleRevoke(key.id, key.name)}
                  >
                    {revoking === key.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Revoke
                      </>
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create an API key</DialogTitle>
            <DialogDescription>
              The key is shown once, immediately after creation. Store it
              somewhere safe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key-name">Name</Label>
              <Input
                id="api-key-name"
                placeholder="e.g. Claude Code on my laptop"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={32}
              />
              <p className="text-muted-foreground text-xs">
                Used to tell keys apart when revoking. Max 32 characters.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key-expiry">Expires in</Label>
              <Select value={expiryDays} onValueChange={setExpiryDays}>
                <SelectTrigger id="api-key-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((option) => (
                    <SelectItem key={option.days} value={String(option.days)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={creating} onClick={() => void handleCreate()}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(newKey)}
        onOpenChange={(open) => !open && setNewKey(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your API key</DialogTitle>
            <DialogDescription>
              This is the only time it will be shown. Tutly stores a hash, so it
              cannot be recovered — if you lose it, revoke and create another.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <code className="bg-muted min-w-0 flex-1 truncate rounded-md border px-3 py-2 font-mono text-xs">
              {newKey}
            </code>
            <Button variant="outline" size="sm" onClick={() => void copyKey()}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <p className="text-muted-foreground text-xs">
            Send it as an <code>x-api-key</code> header, or as{" "}
            <code>Authorization: Bearer …</code>.
          </p>

          <DialogFooter>
            <Button onClick={() => setNewKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
