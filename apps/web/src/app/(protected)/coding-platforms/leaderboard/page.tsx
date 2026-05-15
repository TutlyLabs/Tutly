"use client";

import Link from "next/link";
import { useState } from "react";
import { Code2, Search, LayoutGrid, List } from "lucide-react";
import { SiCodeforces, SiCodechef, SiHackerrank } from "react-icons/si";
import { TbBrandLeetcode } from "react-icons/tb";
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
    icon: TbBrandLeetcode,
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
    color: "text-orange-600",
    profileUrl: (h) => `https://codechef.com/users/${h}`,
  },
  hackerrank: {
    label: "HackerRank",
    icon: SiHackerrank,
    color: "text-emerald-500",
    profileUrl: (h) => `https://hackerrank.com/profile/${h}`,
  },
  interviewbit: {
    label: "InterviewBit",
    icon: Code2,
    color: "text-violet-500",
    profileUrl: (h) => `https://interviewbit.com/profile/${h}`,
  },
};

type ViewMode = "grid" | "list";

export default function CodingLeaderboardPage() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
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
            Profiles your cohort has linked — visible only to people you share a
            mentor or course with.
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
              : "No one in your cohort has linked their coding profiles yet."}
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
        <PlatformTable profiles={filtered} />
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
    <div className={cn("flex flex-shrink-0 items-center gap-3", className)}>
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
            className={cn(
              "bg-muted/60 hover:bg-muted ring-border inline-flex h-7 w-7 items-center justify-center rounded-full ring-1 transition-colors",
              meta.color,
            )}
            aria-label={`${meta.label} profile`}
          >
            <Icon className="h-4 w-4" />
          </a>
        );
      })}
    </div>
  );
}

type Profile = {
  user: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  };
  handles: Record<string, string>;
};

const PLATFORM_ORDER = [
  "leetcode",
  "codeforces",
  "codechef",
  "hackerrank",
  "interviewbit",
] as const;

function PlatformTable({ profiles }: { profiles: Profile[] }) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="bg-muted/40 text-muted-foreground border-b text-[11px] font-medium tracking-wide uppercase">
            <tr>
              <th className="px-4 py-2.5 text-left">User</th>
              {PLATFORM_ORDER.map((p) => {
                const meta = PLATFORM_META[p]!;
                const Icon = meta.icon;
                return (
                  <th key={p} className="px-2 py-2.5 text-center">
                    <span className="inline-flex flex-col items-center gap-1">
                      <Icon className={cn("h-3.5 w-3.5", meta.color)} />
                      <span>{meta.label}</span>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr
                key={profile.user.id}
                className="hover:bg-accent/30 border-border border-b transition-colors last:border-0"
              >
                <td className="px-4 py-2.5">
                  <UserLink
                    username={profile.user.username}
                    className="flex items-center gap-3 hover:opacity-80"
                  >
                    <UserAvatar
                      src={profile.user.image}
                      name={profile.user.name ?? profile.user.username}
                      size={32}
                    />
                    <div className="min-w-0">
                      <div className="text-foreground truncate text-sm font-medium">
                        {profile.user.name ?? profile.user.username}
                      </div>
                      <div className="text-muted-foreground truncate text-xs">
                        @{profile.user.username}
                      </div>
                    </div>
                  </UserLink>
                </td>
                {PLATFORM_ORDER.map((p) => {
                  const handle = profile.handles[p];
                  const meta = PLATFORM_META[p]!;
                  const Icon = meta.icon;
                  return (
                    <td key={p} className="px-2 py-2.5 text-center">
                      {handle ? (
                        <a
                          href={meta.profileUrl(handle)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`${meta.label}: ${handle}`}
                          aria-label={`${meta.label} profile of ${profile.user.username}`}
                          className={cn(
                            "bg-muted/60 hover:bg-muted ring-border inline-flex h-8 w-8 items-center justify-center rounded-full ring-1 transition-colors",
                            meta.color,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground/40 select-none">
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
