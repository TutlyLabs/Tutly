"use client";

import { api } from "@/trpc/react";
import { ProfileView } from "./ProfileView";
import { Lock, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@tutly/ui/button";

export function ProfileViewClient({ username }: { username: string }) {
  const { data: profile, isLoading } = api.users.getPublicProfile.useQuery({
    username,
  });

  if (isLoading) return <ProfileSkeleton />;

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="bg-muted flex h-20 w-20 items-center justify-center rounded-full">
          <User className="text-muted-foreground h-10 w-10" />
        </div>
        <h1 className="text-foreground text-2xl font-bold">User not found</h1>
        <p className="text-muted-foreground">
          No profile exists for @{username}
        </p>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    );
  }

  if ("isPrivate" in profile && profile.isPrivate) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="bg-muted flex h-20 w-20 items-center justify-center rounded-full">
          <Lock className="text-muted-foreground h-10 w-10" />
        </div>
        <h1 className="text-foreground text-2xl font-bold">Private Profile</h1>
        <p className="text-muted-foreground">This profile is private.</p>
      </div>
    );
  }

  return <ProfileView profile={profile as any} />;
}

function ProfileSkeleton() {
  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="bg-background border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="bg-muted h-8 w-20 animate-pulse rounded-md" />
          <div className="bg-muted h-8 w-20 animate-pulse rounded-md" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
          <div className="bg-muted/60 h-24 w-full animate-pulse sm:h-28" />
          <div className="px-5 pb-5 sm:px-7 sm:pb-7">
            <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end">
              <div className="bg-muted border-card h-[104px] w-[104px] flex-shrink-0 animate-pulse rounded-full border-4" />
              <div className="min-w-0 flex-1 space-y-2 sm:pb-2">
                <div className="bg-muted h-7 w-56 animate-pulse rounded" />
                <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                <div className="bg-muted h-4 w-72 animate-pulse rounded" />
                <div className="flex gap-3 pt-1">
                  <div className="bg-muted h-3 w-24 animate-pulse rounded" />
                  <div className="bg-muted h-3 w-28 animate-pulse rounded" />
                </div>
              </div>
              <div className="flex flex-shrink-0 gap-2 sm:pb-2">
                <div className="bg-muted h-8 w-24 animate-pulse rounded-md" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-5">
            <SkeletonSection lines={3} />
            <SkeletonSection lines={2} chips />
            <SkeletonSection lines={2} />
            <SkeletonSection lines={3} chips />
          </aside>

          <div className="space-y-5">
            <div className="bg-card space-y-3 rounded-2xl border p-5 shadow-sm">
              <div className="bg-muted h-5 w-40 animate-pulse rounded" />
              <div className="bg-muted h-24 w-full animate-pulse rounded" />
            </div>
            <div className="bg-card rounded-2xl border p-5 shadow-sm">
              <div className="bg-muted mb-3 h-5 w-32 animate-pulse rounded" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2 rounded-xl border p-4">
                    <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                    <div className="bg-muted h-3 w-full animate-pulse rounded" />
                    <div className="bg-muted h-3 w-3/4 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
            <SkeletonSection lines={3} card="lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonSection({
  lines = 2,
  chips,
  card,
}: {
  lines?: number;
  chips?: boolean;
  card?: "lg";
}) {
  return (
    <div
      className={`bg-card rounded-2xl border p-5 shadow-sm ${
        card === "lg" ? "space-y-3" : ""
      }`}
    >
      <div className="bg-muted mb-3 h-4 w-24 animate-pulse rounded" />
      {chips ? (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-muted h-6 animate-pulse rounded-md"
              style={{ width: `${40 + ((i * 13) % 50)}px` }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="bg-muted h-3 animate-pulse rounded"
              style={{ width: `${100 - i * 15}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
