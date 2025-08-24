import { api } from "@/trpc/server";
import Bookmarks from "./_components/Bookmarks";

export default async function BookmarksPage() {
  const bookmarksData = await api.bookmarks.getUserBookmarks();

  if (!bookmarksData?.success || !bookmarksData.data) {
    return <div>Failed to load bookmarks.</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <Bookmarks bookmarks={bookmarksData.data} />
    </div>
  );
}
