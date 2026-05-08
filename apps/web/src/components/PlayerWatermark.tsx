"use client";

import { useEffect, useState } from "react";

interface Props {
  label: string;
  /** Position-change interval in ms. Default 30s. */
  intervalMs?: number;
}

function pickPosition(): { x: number; y: number } {
  // Stay inside 5%..95% horizontally and 5%..70% vertically so we don't
  // collide with the player controls strip at the bottom.
  return {
    x: 0.05 + Math.random() * 0.9,
    y: 0.05 + Math.random() * 0.65,
  };
}

export function PlayerWatermark({ label, intervalMs = 30_000 }: Props) {
  const [pos, setPos] = useState(() => pickPosition());

  useEffect(() => {
    const t = setInterval(() => setPos(pickPosition()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);

  if (!label) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-20 transition-all duration-[2500ms] ease-in-out select-none"
      style={{
        left: `${pos.x * 100}%`,
        top: `${pos.y * 100}%`,
        transform: "translate(-50%, -50%)",
        color: "rgba(255,255,255,0.32)",
        textShadow: "0 0 6px rgba(0,0,0,0.55), 0 0 1px rgba(0,0,0,0.85)",
        fontSize: "11px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}
