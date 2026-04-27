"use client";

import type { Account, Session } from "@tutly/db/browser";
import { HardDrive, Laptop, Monitor, Smartphone, Tablet } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@tutly/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tutly/ui/tabs";
import { api } from "@/trpc/react";
import { extractDeviceLabel } from "@/utils/device";

const providers = [
  "credentials",
  // , "google"
];

type SessionsModalProps = {
  sessions: Session[];
  accounts: Account[];
  currentSessionId?: string;
};

export default function Sessions({
  sessions,
  accounts,
  currentSessionId,
}: SessionsModalProps) {
  const router = useRouter();
  const { mutate: deleteSession } = api.users.deleteSession.useMutation({
    onSuccess: () => {
      toast.success("Session deleted successfully");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete session");
    },
  });

  const handleDeleteSession = async (sessionId: string) => {
    try {
      deleteSession({ sessionId });
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const handleConnect = (provider: string) => {
    router.push(`/api/auth/signin/${provider}`);
  };

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <HardDrive className="h-5 w-5" />;

    const ua = userAgent.toLowerCase();
    if (
      ua.includes("mobile") ||
      ua.includes("android") ||
      ua.includes("iphone")
    ) {
      return <Smartphone className="h-5 w-5" />;
    } else if (ua.includes("tablet") || ua.includes("ipad")) {
      return <Tablet className="h-5 w-5" />;
    } else if (
      ua.includes("windows") ||
      ua.includes("macintosh") ||
      ua.includes("linux")
    ) {
      return <Laptop className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div>
        <h2 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          Account Settings
        </h2>
        <p className="text-muted-foreground text-sm">
          Manage your active sessions and connected accounts.
        </p>
      </div>
      <div className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
        <Tabs defaultValue="sessions" className="w-full">
          <TabsList className="bg-muted/40 inline-flex h-9 w-full sm:w-auto items-center gap-1 rounded-lg p-1">
            <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
            <TabsTrigger value="connections">Connected Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="mt-6 space-y-4">
            {sessions.map((session) => {
              const isCurrentSession = session.id === currentSessionId;
              const deviceInfo = extractDeviceLabel(session.userAgent || "");

              return (
                <div
                  key={session.id}
                  className="hover:border-primary/50 bg-card flex items-center justify-between rounded-lg border p-4 shadow-sm transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-muted rounded-lg border p-2.5">
                      {getDeviceIcon(session.userAgent)}
                    </div>
                    <div>
                      <p className="font-medium">{deviceInfo}</p>
                      <p className="text-muted-foreground text-sm">
                        {isCurrentSession
                          ? "Current session"
                          : "Active session"}
                      </p>
                    </div>
                  </div>
                  {!isCurrentSession && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteSession(session.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="connections" className="mt-6 space-y-4">
            {Object.entries(providers).map(([key, _]) => {
              if (key === "credentials") return null;
              const isConnected = accounts.some(
                (account) => account.providerId === key,
              );

              return (
                <div
                  key={key}
                  className="hover:border-primary/50 bg-card flex items-center justify-between rounded-lg border p-4 shadow-sm transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-muted rounded-lg border p-2.5">
                      <span className="text-lg font-semibold">
                        {key === "google" ? "G" : "GH"}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium capitalize">{key}</p>
                      <p className="text-muted-foreground text-sm">
                        {isConnected ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={isConnected ? "destructive" : "default"}
                    size="sm"
                    onClick={() => !isConnected && handleConnect(key)}
                  >
                    {isConnected ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

