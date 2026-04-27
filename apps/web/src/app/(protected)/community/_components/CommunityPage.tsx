"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useClientSession } from "@/lib/auth/client";
import { GroupSidebar } from "./GroupSidebar";
import { ChatView } from "./ChatView";
import { cn } from "@tutly/utils";

export function CommunityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(
    searchParams.get("g"),
  );
  const { data: session } = useClientSession();

  const {
    data: groups = [],
    isLoading,
    refetch,
  } = api.chat.getMyGroups.useQuery();

  // React to URL changes (e.g., "Message" button from profile page while already on community)
  useEffect(() => {
    const g = searchParams.get("g");
    if (g && g !== activeGroupId) setActiveGroupId(g);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL when group changes
  useEffect(() => {
    if (activeGroupId) {
      router.replace(`/community?g=${activeGroupId}`, { scroll: false });
    } else {
      router.replace("/community", { scroll: false });
    }
  }, [activeGroupId, router]);

  // Auto-select first group on desktop
  useEffect(() => {
    if (!activeGroupId && groups.length > 0 && window.innerWidth >= 768) {
      setActiveGroupId(groups[0]!.id);
    }
  }, [groups, activeGroupId]);

  const currentUser = session?.user;
  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;

  return (
    <div className="bg-card flex h-[calc(100vh-4rem)] overflow-hidden sm:rounded-xl sm:border sm:shadow-sm">
      <div
        className={cn(
          "bg-background flex flex-col border-r",
          "w-full md:w-80 md:flex-shrink-0 lg:w-96",
          activeGroupId ? "hidden md:flex" : "flex",
        )}
      >
        <GroupSidebar
          groups={groups}
          isLoading={isLoading}
          activeGroupId={activeGroupId}
          onSelect={setActiveGroupId}
          onGroupCreated={(id) => {
            void refetch();
            setActiveGroupId(id);
          }}
          currentUserId={currentUser?.id ?? ""}
        />
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          activeGroupId ? "flex" : "hidden md:flex",
        )}
      >
        {activeGroup && currentUser ? (
          <ChatView
            group={activeGroup}
            currentUser={currentUser}
            onBack={() => setActiveGroupId(null)}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="bg-primary/10 flex h-20 w-20 items-center justify-center rounded-full">
        <svg
          className="text-primary h-10 w-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <h3 className="text-foreground text-lg font-semibold">
        Select a conversation
      </h3>
      <p className="text-muted-foreground max-w-xs text-sm">
        Pick a group from the left to start chatting with your classmates and
        peers.
      </p>
    </div>
  );
}
