"use client";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import Bookmarks from "./_components/Bookmarks";

export default function BookmarksPage() {
  const q = api.bookmarks.getUserBookmarks.useQuery();
  if (q.isLoading) return <PageLoader />;
  if (!q.data?.success || !q.data.data) {
    return (
      <div className="text-muted-foreground bg-card flex h-64 items-center justify-center rounded-xl border text-sm">
        Failed to load bookmarks.
      </div>
    );
  }
  return <Bookmarks bookmarks={q.data.data} />;
}
