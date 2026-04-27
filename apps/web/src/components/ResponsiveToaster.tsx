"use client";

import { Toaster } from "sonner";
import { useIsMobile } from "@tutly/hooks";

export function ResponsiveToaster() {
  const isMobile = useIsMobile();
  return (
    <Toaster
      position={isMobile ? "top-center" : "bottom-right"}
      offset={isMobile ? "calc(env(safe-area-inset-top) + 12px)" : 16}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
    />
  );
}
