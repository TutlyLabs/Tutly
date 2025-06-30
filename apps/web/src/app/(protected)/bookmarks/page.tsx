"use client";

import { api } from "@/trpc/react";
import Bookmarks from "./_components/Bookmarks";

export default function BookmarksPage() {
  const { data: bookmarksData, isLoading } =
    api.bookmarks.getUserBookmarks.useQuery();

  if (isLoading) {
    return <div>Loading bookmarks...</div>;
  }

  if (!bookmarksData?.success || !bookmarksData.data) {
    return <div>Failed to load bookmarks.</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <Bookmarks bookmarks={bookmarksData.data} />
    </div>
  );
}
