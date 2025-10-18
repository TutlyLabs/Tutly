"use client";

import { AlertCircle, User, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/server/auth/client";
import { toast } from "sonner";
import type { SessionUser } from "@/lib/auth";

interface ImpersonationBannerProps {
  user: SessionUser;
  onStopImpersonating?: () => void;
}

export function ImpersonationBanner({
  user,
  onStopImpersonating,
}: ImpersonationBannerProps) {
  const handleStopImpersonating = async () => {
    try {
      await authClient.admin.stopImpersonating();
      toast.success("Successfully stopped impersonation");
      if (onStopImpersonating) {
        onStopImpersonating();
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to stop impersonation");
    }
  };

  return (
    <div className="border-b border-slate-700 bg-slate-800 px-4 py-1.5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="flex max-w-full items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <span className="truncate text-xs font-normal text-slate-300">
            Viewing as
          </span>
          <div className="flex min-w-0 items-center gap-1.5">
            <User className="h-3 w-3 flex-shrink-0 text-slate-400" />
            <span className="truncate text-xs font-medium text-slate-200">
              {user.name || user.email}
            </span>
            {user.username && (
              <span className="hidden truncate text-xs text-slate-400 sm:inline">
                @{user.username}
              </span>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-1 rounded border border-slate-600 px-1.5 py-0.5">
            <Shield className="h-3 w-3 text-slate-400" />
            <span className="text-xs text-slate-300">{user.role}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStopImpersonating}
          className="h-6 flex-shrink-0 cursor-pointer px-2 py-0 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          <LogOut className="mr-1 h-3 w-3" />
          Exit
        </Button>
      </div>
    </div>
  );
}
