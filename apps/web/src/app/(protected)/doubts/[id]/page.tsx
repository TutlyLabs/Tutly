"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserLink } from "@/components/UserLink";
import { ArrowLeft, MessageSquare, Clock, ExternalLink } from "lucide-react";
import { api } from "@/trpc/react";
import { Button } from "@tutly/ui/button";
import { Badge } from "@tutly/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@tutly/utils";

const ROLE_COLORS: Record<string, string> = {
  INSTRUCTOR:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  MENTOR: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  STUDENT:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function DoubtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = api.doubts.getDoubtById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <div className="bg-muted h-6 w-32 animate-pulse rounded" />
        <div className="bg-muted h-32 animate-pulse rounded-xl" />
        {[1, 2].map((i) => (
          <div key={i} className="bg-muted h-20 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data?.doubt) {
    return (
      <div className="flex flex-col items-center gap-4 p-12 text-center">
        <MessageSquare className="text-muted-foreground/40 h-12 w-12" />
        <h2 className="text-foreground text-lg font-semibold">
          Doubt not found
        </h2>
        <p className="text-muted-foreground text-sm">
          This doubt may have been deleted or you don't have access to it.
        </p>
        <Button asChild variant="outline">
          <Link href="/community">Go to Community</Link>
        </Button>
      </div>
    );
  }

  const { doubt, communityGroupId } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-1.5">
          <Link
            href={
              communityGroupId
                ? `/community?g=${communityGroupId}`
                : "/community"
            }
          >
            <ArrowLeft className="h-4 w-4" />
            {communityGroupId ? "Back to Course Chat" : "Community"}
          </Link>
        </Button>
        {doubt.course && (
          <span className="text-muted-foreground text-sm">
            ·{" "}
            <Link
              href={`/courses/detail?id=${doubt.course.id}`}
              className="hover:underline"
            >
              {doubt.course.title}
            </Link>
          </span>
        )}
      </div>

      {/* Doubt card */}
      <div className="bg-card rounded-xl border p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <UserLink username={doubt.user.username} className="flex-shrink-0">
            {doubt.user.image ? (
              <Image
                src={doubt.user.image}
                alt={doubt.user.name ?? doubt.user.username}
                width={40}
                height={40}
                className="rounded-full transition-opacity hover:opacity-80"
              />
            ) : (
              <div className="bg-primary/20 text-primary flex h-10 w-10 items-center justify-center rounded-full font-semibold">
                {(doubt.user.name ?? doubt.user.username)[0]?.toUpperCase()}
              </div>
            )}
          </UserLink>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <UserLink
                username={doubt.user.username}
                className="text-foreground font-semibold"
              >
                {doubt.user.name ?? doubt.user.username}
              </UserLink>
              <Badge
                className={cn(
                  "px-1.5 py-0 text-[10px]",
                  ROLE_COLORS[doubt.user.role] ??
                    "bg-muted text-muted-foreground",
                )}
                variant="secondary"
              >
                {doubt.user.role.toLowerCase()}
              </Badge>
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(doubt.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
            {doubt.title && (
              <h1 className="text-foreground mt-2 text-xl leading-snug font-semibold">
                {doubt.title}
              </h1>
            )}
            {doubt.description && (
              <p className="text-foreground/90 mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                {doubt.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Responses */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-muted-foreground text-sm font-semibold tracking-wider uppercase">
            {doubt.response.length}{" "}
            {doubt.response.length === 1 ? "Response" : "Responses"}
          </h2>
          {communityGroupId && (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href={`/community?g=${communityGroupId}`}>
                <MessageSquare className="h-3.5 w-3.5" />
                Continue in Community
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>

        {doubt.response.length === 0 ? (
          <div className="bg-muted/30 rounded-xl border border-dashed p-6 text-center">
            <p className="text-muted-foreground text-sm">No responses yet.</p>
            {communityGroupId && (
              <Button asChild variant="link" size="sm" className="mt-1">
                <Link href={`/community?g=${communityGroupId}`}>
                  Discuss in Course Chat →
                </Link>
              </Button>
            )}
          </div>
        ) : (
          doubt.response.map((resp) => (
            <div
              key={resp.id}
              className="bg-card flex gap-3 rounded-xl border p-4 shadow-sm"
            >
              <UserLink username={resp.user.username} className="flex-shrink-0">
                {resp.user.image ? (
                  <Image
                    src={resp.user.image}
                    alt={resp.user.name ?? resp.user.username}
                    width={36}
                    height={36}
                    className="rounded-full transition-opacity hover:opacity-80"
                  />
                ) : (
                  <div className="bg-primary/20 text-primary flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold">
                    {(resp.user.name ?? resp.user.username)[0]?.toUpperCase()}
                  </div>
                )}
              </UserLink>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <UserLink
                    username={resp.user.username}
                    className="text-foreground text-sm font-semibold"
                  >
                    {resp.user.name ?? resp.user.username}
                  </UserLink>
                  <Badge
                    className={cn(
                      "px-1.5 py-0 text-[10px]",
                      ROLE_COLORS[resp.user.role] ??
                        "bg-muted text-muted-foreground",
                    )}
                    variant="secondary"
                  >
                    {resp.user.role.toLowerCase()}
                  </Badge>
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(resp.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-foreground/90 mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">
                  {resp.description}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CTA to community */}
      {communityGroupId && (
        <div className="bg-primary/5 border-primary/20 rounded-xl border p-4 text-center">
          <p className="text-foreground/80 mb-2 text-sm">
            Continue the conversation with your classmates in the course chat.
          </p>
          <Button asChild>
            <Link href={`/community?g=${communityGroupId}`}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Open Course Chat
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
