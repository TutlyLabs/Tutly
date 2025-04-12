"use client";

import React from "react";
import { HeroParallax } from "@/components/ui/hero-parallax";

export function Home() {
  return <HeroParallax products={products} />;
}
export const products = [
  {
    title: "Dashboard",
    thumbnail: "/images/hero/home.png",
  },
  {
    title: "Attendance",
    thumbnail: "/images/hero/attendance.png",
  },
  {
    title: "Statistics",
    thumbnail: "/images/hero/stats.png",
  },
  {
    title: "Activity",
    thumbnail: "/images/hero/activity.png",
  },
  {
    title: "Class",
    thumbnail: "/images/hero/class.png",
  },
  {
    title: "Leaderboard",
    thumbnail: "/images/hero/leaderboard.png",
  },

  {
    title: "Events",
    thumbnail: "/images/hero/events.png",
  },
  {
    title: "Reports",
    thumbnail: "/images/hero/reports.png",
  },
  {
    title: "Playgrounds",
    thumbnail: "/images/hero/playgrounds.png",
  },
];
