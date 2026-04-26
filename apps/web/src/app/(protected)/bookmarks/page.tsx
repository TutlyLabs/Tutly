"use client";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import Bookmarks from "./_components/Bookmarks";

export default function BookmarksPage() {
  const q = api.bookmarks.getUserBookmarks.useQuery();
  if (q.isLoading) return <PageLoader />;
  if (!q.data?.success || !q.data.data) {
    return <div>Failed to load bookmarks.</div>;
  }
  return (
    <div className="container mx-auto py-6">
      <Bookmarks bookmarks={q.data.data} />
    </div>
  );
}
