"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";

const SHOW_DELAY_MS = 80;
const HIDE_DELAY_MS = 220;
const STALL_MS = 8000;

export default function TopProgress() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [active, setActive] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPulseKey((k) => k + 1);
  }, [pathname, searchParams]);

  useEffect(() => {
    const busy = isFetching > 0 || isMutating > 0;

    if (busy) {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      if (!active && !showTimer.current) {
        showTimer.current = setTimeout(() => {
          setActive(true);
          showTimer.current = null;
          if (stallTimer.current) clearTimeout(stallTimer.current);
          stallTimer.current = setTimeout(() => {
            setActive(false);
          }, STALL_MS);
        }, SHOW_DELAY_MS);
      }
    } else {
      if (showTimer.current) {
        clearTimeout(showTimer.current);
        showTimer.current = null;
      }
      if (active && !hideTimer.current) {
        hideTimer.current = setTimeout(() => {
          setActive(false);
          hideTimer.current = null;
          if (stallTimer.current) {
            clearTimeout(stallTimer.current);
            stallTimer.current = null;
          }
        }, HIDE_DELAY_MS);
      }
    }

    return () => {
      // Cleanup happens on unmount only — interval timers are managed above.
    };
  }, [isFetching, isMutating, active]);

  useEffect(() => {
    return () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (stallTimer.current) clearTimeout(stallTimer.current);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        key={pulseKey}
        className={
          active
            ? "tp-bar tp-bar-running"
            : "tp-bar tp-bar-finishing"
        }
      />
      <style jsx>{`
        .tp-bar {
          height: 2px;
          width: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            hsl(var(--primary-h, 217) 91% 60% / 0.95) 35%,
            hsl(var(--primary-h, 217) 91% 75% / 0.95) 65%,
            transparent 100%
          );
          transform: translateX(-100%);
          opacity: 0;
          transition:
            opacity 200ms ease,
            transform 600ms cubic-bezier(0.65, 0, 0.35, 1);
        }
        .tp-bar-running {
          opacity: 1;
          animation: tp-slide 1.1s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
        .tp-bar-finishing {
          opacity: 0;
          transform: translateX(100%);
        }
        @keyframes tp-slide {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(15%);
          }
          100% {
            transform: translateX(110%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .tp-bar {
            animation: none !important;
            transition: opacity 100ms linear !important;
          }
        }
      `}</style>
    </div>
  );
}
