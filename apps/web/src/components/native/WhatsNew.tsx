"use client";

import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";

import { Button } from "@tutly/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@tutly/ui/sheet";

import { currentAppVersion } from "@/lib/native-version";
import { isNative } from "@/lib/native";

const SEEN_KEY = "tutly:whats-new-seen";

interface ChangelogEntry {
  title: string;
  detail?: string;
}

const RELEASE_NOTES: Record<string, ChangelogEntry[]> = {
  "3.6.0": [
    { title: "A native, polished mobile app", detail: "Brand new mobile shell with hamburger menu, sheet notifications, and a calmer dark mode." },
    { title: "Always-on loading states", detail: "Skeleton screens and a top progress bar keep things alive while data loads." },
    { title: "Pull to refresh", detail: "Drag down anywhere on dashboard, courses, or assignments to refresh." },
    { title: "Update prompts", detail: "We'll let you know when a new version of Tutly is ready." },
  ],
};

export default function WhatsNew() {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = currentAppVersion();
    const seen = window.localStorage.getItem(SEEN_KEY);
    if (seen === v) return;
    if (!RELEASE_NOTES[v]) {
      window.localStorage.setItem(SEEN_KEY, v);
      return;
    }
    // Only auto-show inside the native app or installed PWA, to avoid
    // popping up for casual web visitors.
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari PWA flag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;
    if (!isNative() && !isStandalone) {
      window.localStorage.setItem(SEEN_KEY, v);
      return;
    }
    setVersion(v);
    setOpen(true);
  }, []);

  const handleDismiss = () => {
    if (typeof window !== "undefined" && version) {
      window.localStorage.setItem(SEEN_KEY, version);
    }
    setOpen(false);
  };

  if (!version) return null;
  const entries = RELEASE_NOTES[version] ?? [];

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) handleDismiss();
        else setOpen(o);
      }}
    >
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-t p-0 sm:max-w-md sm:mx-auto"
      >
        <div className="flex flex-col gap-4 px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-2xl">
              <Sparkles className="h-5 w-5" />
            </div>
            <SheetHeader className="space-y-0.5 p-0 text-left">
              <SheetTitle className="text-foreground text-lg">
                What's new in v{version}
              </SheetTitle>
              <SheetDescription className="text-muted-foreground text-xs">
                The latest improvements to Tutly.
              </SheetDescription>
            </SheetHeader>
          </div>
          <ul className="flex flex-col gap-3">
            {entries.map((e, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-foreground text-sm font-medium">
                    {e.title}
                  </p>
                  {e.detail && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {e.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Button onClick={handleDismiss} className="mt-2 h-10 w-full text-sm">
            Got it
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
