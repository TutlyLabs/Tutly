import { Sun } from "lucide-react";
import { Moon } from "lucide-react";
import * as React from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
    <div>
      <div className="relative inline-grid h-9 grid-cols-[1fr_1fr] items-center text-sm font-medium">
        <Switch
          id="theme-toggle"
          checked={isDark}
          onCheckedChange={setIsDark}
          className="peer data-[state=checked]:bg-input/50 data-[state=unchecked]:bg-input/50 absolute inset-0 h-[inherit] w-auto [&_span]:h-full [&_span]:w-1/2 [&_span]:transition-transform [&_span]:duration-300 [&_span]:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)] data-[state=checked]:[&_span]:translate-x-full rtl:data-[state=checked]:[&_span]:-translate-x-full"
        />
        <span className="peer-data-[state=unchecked]:text-muted-foreground/70 pointer-events-none relative me-0.5 flex min-w-8 items-center justify-center text-center">
          <Sun size={16} strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="peer-data-[state=checked]:text-muted-foreground/70 pointer-events-none relative ms-0.5 flex min-w-8 items-center justify-center text-center">
          <Moon size={16} strokeWidth={2} aria-hidden="true" />
        </span>
      </div>
      <Label htmlFor="theme-toggle" className="sr-only">
        Toggle theme
      </Label>
    </div>
  );
}
