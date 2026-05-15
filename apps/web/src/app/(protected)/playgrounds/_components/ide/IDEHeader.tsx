"use client";

import {
  ArrowLeft,
  Command as CommandIcon,
  Maximize,
  Minimize,
  Settings as SettingsIcon,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@tutly/ui/button";

type Props = {
  title: string;
  rightSlot?: React.ReactNode;
};

export default function IDEHeader({ title, rightSlot }: Props) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const fn = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);

  const toggleFs = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  };

  return (
    <div className="bg-muted/20 flex h-9 shrink-0 items-center justify-between gap-3 border-b px-3">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-muted-foreground hover:text-foreground"
        >
          <Link href="/playgrounds" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
        </Button>
        <span className="bg-border hidden h-4 w-px sm:inline-block" />
        <div className="flex min-w-0 items-center gap-2">
          <div className="border-primary/30 bg-primary/10 text-primary grid h-6 w-6 shrink-0 place-items-center rounded-md border text-[10px] font-bold">
            T
          </div>
          <div className="truncate text-sm font-semibold">{title}</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("tutly:open-palette", {
                detail: { mode: "commands" },
              }),
            )
          }
          className="bg-background text-muted-foreground hover:text-foreground hidden h-7 items-center gap-2 rounded-md border px-2.5 text-xs md:flex"
          title="Open command palette (⌘⇧P)"
        >
          <CommandIcon className="h-3.5 w-3.5" />
          <span className="tracking-wider">⌘⇧P to run a command</span>
        </button>
        {rightSlot}
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("tutly:format-document"))
          }
          title="Format document (⌘⇧F)"
          className="text-muted-foreground hover:text-foreground"
        >
          <Wand2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("tutly:open-settings"))
          }
          title="Editor settings"
          className="text-muted-foreground hover:text-foreground"
        >
          <SettingsIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFs}
          title="Toggle fullscreen"
          className="text-muted-foreground hover:text-foreground"
        >
          {fullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
