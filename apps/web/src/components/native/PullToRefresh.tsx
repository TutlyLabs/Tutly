"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ArrowDown } from "lucide-react";

import { isNative } from "@/lib/native";
import { haptics } from "@/lib/haptics";
import { cn } from "@tutly/utils";

interface PullToRefreshProps {
  /** Async callback. Resolve when refresh is complete to dismiss the spinner. */
  onRefresh: () => Promise<unknown> | void;
  /** Children rendered inside the pull container. */
  children: React.ReactNode;
  /** If true, pull works on web too (default: native-only). */
  enabledOnWeb?: boolean;
  /** Pull distance in px to trigger refresh. Default 70. */
  threshold?: number;
  className?: string;
}

const RESISTANCE = 0.45;

export function PullToRefresh({
  onRefresh,
  children,
  enabledOnWeb = false,
  threshold = 70,
  className,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const triggeredHapticRef = useRef(false);

  useEffect(() => {
    const native = isNative();
    if (!native && !enabledOnWeb) return;
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (window.scrollY > 4) return;
      startYRef.current = e.touches[0]?.clientY ?? null;
      triggeredHapticRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null) return;
      if (refreshing) return;
      const y = e.touches[0]?.clientY ?? 0;
      const delta = y - startYRef.current;
      if (delta <= 0) {
        setPull(0);
        return;
      }
      const dampened = delta * RESISTANCE;
      setPull(dampened);
      if (dampened > threshold && !triggeredHapticRef.current) {
        triggeredHapticRef.current = true;
        void haptics.light();
      } else if (dampened <= threshold && triggeredHapticRef.current) {
        triggeredHapticRef.current = false;
      }
      // Stop the page from scrolling once we've started pulling.
      if (dampened > 4) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (startYRef.current === null) return;
      const final = pull;
      startYRef.current = null;
      if (final > threshold && !refreshing) {
        setRefreshing(true);
        setPull(threshold);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
        return;
      }
      setPull(0);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabledOnWeb, onRefresh, pull, refreshing, threshold]);

  const ratio = Math.min(1, pull / threshold);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-center"
        style={{
          transform: `translateY(${pull - threshold}px)`,
          transition:
            startYRef.current === null && !refreshing
              ? "transform 240ms cubic-bezier(0.65, 0, 0.35, 1)"
              : undefined,
        }}
      >
        <div
          className={cn(
            "bg-card border-border mt-1 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm",
            refreshing && "animate-pulse",
          )}
          style={{ opacity: ratio }}
        >
          {refreshing ? (
            <Loader2 className="text-primary h-4 w-4 animate-spin" />
          ) : (
            <ArrowDown
              className="text-muted-foreground h-4 w-4 transition-transform"
              style={{ transform: `rotate(${ratio * 180}deg)` }}
            />
          )}
        </div>
      </div>
      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition:
            startYRef.current === null && !refreshing
              ? "transform 240ms cubic-bezier(0.65, 0, 0.35, 1)"
              : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
