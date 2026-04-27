"use client";

import Link from "next/link";
import { useState } from "react";
import { Code2, Search, LayoutGrid, List } from "lucide-react";
import {
  SiLeetcode,
  SiCodeforces,
  SiCodechef,
  SiHackerrank,
} from "react-icons/si";
import type { IconType } from "react-icons";

import { UserAvatar } from "@/components/UserAvatar";
import { UserLink } from "@/components/UserLink";
import { api } from "@/trpc/react";
import { Input } from "@tutly/ui/input";
import { Skeleton } from "@tutly/ui/skeleton";
import { cn } from "@tutly/utils";

const PLATFORM_META: Record<
  string,
  {
    label: string;
    icon: IconType;
    color: string;
    profileUrl: (handle: string) => string;
  }
> = {
  leetcode: {
    label: "LeetCode",
    icon: SiLeetcode,
    color: "text-amber-500",
    profileUrl: (h) => `https://leetcode.com/${h}`,
  },
  codeforces: {
    label: "Codeforces",
    icon: SiCodeforces,
    color: "text-blue-500",
    profileUrl: (h) => `https://codeforces.com/profile/${h}`,
  },
  codechef: {
    label: "CodeChef",
    icon: SiCodechef,
    color: "text-orange-700",
    profileUrl: (h) => `https://codechef.com/users/${h}`,
  },
  hackerrank: {
    label: "HackerRank",
    icon: SiHackerrank,
    color: "text-green-500",
    profileUrl: (h) => `https://hackerrank.com/profile/${h}`,
  },
  interviewbit: {
    label: "InterviewBit",
    icon: Code2,
    color: "text-purple-500",
    profileUrl: (h) => `https://interviewbit.com/profile/${h}`,
  },
};

type ViewMode = "grid" | "list";

export default function CodingLeaderboardPage() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const { data: profiles = [], isLoading } =
    api.codingPlatforms.getOrgCodingProfiles.useQuery();

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (p.user.name ?? "").toLowerCase().includes(q) ||
      p.user.username.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
            Coding Profiles
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Classmates who linked their competitive programming profiles
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Search…"
              className="h-9 pl-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="bg-muted/50 flex shrink-0 items-center rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded transition-colors",
                view === "grid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded transition-colors",
                view === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div
          className={cn(
            view === "grid"
              ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              : "space-y-2",
          )}
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton
              key={i}
              className={
                view === "grid" ? "h-24 rounded-xl" : "h-14 rounded-lg"
              }
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Code2 className="text-muted-foreground/30 h-12 w-12" />
          <p className="text-muted-foreground text-sm">
            {search
              ? "No matching profiles found."
              : "No one has linked their coding profiles yet."}
          </p>
          <Link
            href="/profile"
            className="text-primary text-sm hover:underline"
          >
            Add your coding profiles →
          </Link>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((profile) => (
            <div
              key={profile.user.id}
              className="bg-card flex items-center gap-3 rounded-xl border p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <UserLink
                username={profile.user.username}
                className="flex-shrink-0 hover:opacity-80"
              >
                <UserAvatar
                  src={profile.user.image}
                  name={profile.user.name ?? profile.user.username}
                  size={40}
                />
              </UserLink>
              <div className="min-w-0 flex-1">
                <UserLink
                  username={profile.user.username}
                  className="text-foreground block truncate text-sm font-semibold"
                >
                  {profile.user.name ?? profile.user.username}
                </UserLink>
                <p className="text-muted-foreground truncate text-xs">
                  @{profile.user.username}
                </p>
                <PlatformIcons handles={profile.handles} className="mt-1.5" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card divide-y rounded-xl border shadow-sm">
          {filtered.map((profile) => (
            <div
              key={profile.user.id}
              className="hover:bg-accent/30 flex items-center gap-3 px-3 py-2.5 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <UserLink
                username={profile.user.username}
                className="flex-shrink-0 hover:opacity-80"
              >
                <UserAvatar
                  src={profile.user.image}
                  name={profile.user.name ?? profile.user.username}
                  size={32}
                />
              </UserLink>
              <div className="min-w-0 flex-1">
                <UserLink
                  username={profile.user.username}
                  className="text-foreground block truncate text-sm font-medium"
                >
                  {profile.user.name ?? profile.user.username}
                </UserLink>
                <p className="text-muted-foreground truncate text-xs">
                  @{profile.user.username}
                </p>
              </div>
              <PlatformIcons handles={profile.handles} />
            </div>
          ))}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="text-muted-foreground text-center text-xs">
          {filtered.length} {filtered.length === 1 ? "member" : "members"}
          {search && ` matching "${search}"`}
        </p>
      )}
    </div>
  );
}

function PlatformIcons({
  handles,
  className,
}: {
  handles: Record<string, string>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-shrink-0 items-center gap-2", className)}>
      {Object.entries(handles).map(([platform, handle]) => {
        const meta = PLATFORM_META[platform];
        if (!meta) return null;
        const Icon = meta.icon;
        return (
          <a
            key={platform}
            href={meta.profileUrl(handle)}
            target="_blank"
            rel="noopener noreferrer"
            title={`${meta.label}: ${handle}`}
            className={cn("transition-opacity hover:opacity-70", meta.color)}
          >
            <Icon className="h-4 w-4" />
          </a>
        );
      })}
    </div>
  );
}
