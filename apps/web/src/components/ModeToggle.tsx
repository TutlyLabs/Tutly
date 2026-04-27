"use client";

import { Moon, Sun } from "lucide-react";
import * as React from "react";

import { Button } from "@tutly/ui/button";
import { Switch } from "@tutly/ui/switch";
import { cn } from "@tutly/utils";

export function ModeToggle() {
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window !== "undefined") {
      const theme = localStorage.getItem("theme");
      if (theme) return theme === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        title={isDark ? "Light mode" : "Dark mode"}
        onClick={() => setIsDark((v) => !v)}
        className="hover:bg-accent relative h-9 w-9 cursor-pointer sm:hidden"
      >
        <Sun className="h-[18px] w-[18px] scale-100 rotate-0 transition-all duration-300 dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute h-[18px] w-[18px] scale-0 rotate-90 transition-all duration-300 dark:scale-100 dark:rotate-0" />
      </Button>

      <div className="relative hidden h-9 grid-cols-[1fr_1fr] items-center text-sm font-medium sm:inline-grid">
        <Switch
          id="theme-toggle"
          checked={isDark}
          onCheckedChange={setIsDark}
          aria-label="Toggle theme"
          className={cn(
            "peer data-[state=checked]:bg-input/50 data-[state=unchecked]:bg-input/50",
            "absolute inset-0 h-[inherit] w-auto",
            "[&_span]:h-full [&_span]:w-1/2",
            "[&_span]:transition-transform [&_span]:duration-300",
            "[&_span]:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
            "data-[state=checked]:[&_span]:translate-x-full",
            "rtl:data-[state=checked]:[&_span]:-translate-x-full",
          )}
        />
        <span
          aria-hidden
          className="peer-data-[state=unchecked]:text-muted-foreground/70 pointer-events-none relative me-0.5 flex min-w-8 items-center justify-center text-center"
        >
          <Sun size={16} aria-hidden />
        </span>
        <span
          aria-hidden
          className="peer-data-[state=checked]:text-muted-foreground/70 pointer-events-none relative ms-0.5 flex min-w-8 items-center justify-center text-center"
        >
          <Moon size={16} aria-hidden />
        </span>
      </div>
    </>
  );
}

export default ModeToggle;
