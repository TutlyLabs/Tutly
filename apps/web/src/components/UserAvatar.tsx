"use client";

import { useState } from "react";
import { cn } from "@tutly/utils";

const COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-orange-500",
];

function colorFor(name: string) {
  return COLORS[name.charCodeAt(0) % COLORS.length]!;
}

export function UserAvatar({
  src,
  name,
  size = 32,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const [error, setError] = useState(false);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  if (src && !error) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={cn("flex-shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white",
        colorFor(name),
        className,
      )}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </div>
  );
}
