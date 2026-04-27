"use client";

import type { BookMarkCategory, BookMarks } from "@tutly/db/browser";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  BookOpen,
  ChevronRight,
  FileQuestion,
  ScrollText,
} from "lucide-react";
import Link from "next/link";

import { ScrollArea, ScrollBar } from "@tutly/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tutly/ui/tabs";
import NoDataFound from "@/components/NoDataFound";

interface CausedObjects {
  courseId: string;
  classId: string;
}

const getBookmarkDetails = (
  category: BookMarkCategory,
  objectId: string,
  causedObjects: CausedObjects,
) => {
  const config = {
    ASSIGNMENT: {
      icon: ScrollText,
      href: `/assignments/detail?id=${objectId}`,
      bg: "bg-amber-500/15",
      fg: "text-amber-500",
      label: "Assignment",
    },
    CLASS: {
      icon: BookOpen,
      href: `/courses/class?id=${causedObjects?.courseId}&classId=${objectId}`,
      bg: "bg-sky-500/15",
      fg: "text-sky-500",
      label: "Class",
    },
    DOUBT: {
      icon: FileQuestion,
      href: `/doubts/${objectId}`,
      bg: "bg-emerald-500/15",
      fg: "text-emerald-500",
      label: "Doubt",
    },
    NOTIFICATION: {
      icon: Bell,
      href: `/notifications/${objectId}`,
      bg: "bg-purple-500/15",
      fg: "text-purple-500",
      label: "Notification",
    },
  };

  return config[category];
};

const Bookmarks = ({ bookmarks }: { bookmarks: BookMarks[] }) => {
  const categories = ["ALL", ...new Set(bookmarks.map((b) => b.category))];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div>
        <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          Bookmarks
        </h1>
        <p className="text-muted-foreground text-sm">
          {bookmarks.length}{" "}
          {bookmarks.length === 1 ? "saved item" : "saved items"}
        </p>
      </div>

      <Tabs defaultValue="ALL" className="space-y-3">
        <ScrollArea className="-mx-3 sm:mx-0">
          <TabsList className="bg-muted/40 mx-3 inline-flex h-9 w-max items-center gap-1 rounded-lg p-1 sm:mx-0">
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="data-[state=active]:bg-background data-[state=active]:text-foreground h-7 rounded-md px-3 text-xs font-medium whitespace-nowrap data-[state=active]:shadow-sm"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>

        {categories.map((category) => {
          const list = bookmarks.filter(
            (b) => category === "ALL" || b.category === category,
          );
          return (
            <TabsContent key={category} value={category} className="m-0">
              {list.length === 0 ? (
                <div className="bg-card rounded-xl border p-8 shadow-sm">
                  <NoDataFound message="No bookmarks here yet" />
                </div>
              ) : (
                <ul className="bg-card divide-border divide-y overflow-hidden rounded-xl border shadow-sm">
                  {list.map((bookmark) => {
                    const details = getBookmarkDetails(
                      bookmark.category,
                      bookmark.objectId,
                      bookmark.causedObjects as unknown as CausedObjects,
                    );
                    const Icon = details.icon;
                    return (
                      <li key={bookmark.id}>
                        <Link
                          href={details.href}
                          className="hover:bg-accent/40 flex items-center gap-3 px-4 py-3 transition-colors"
                        >
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${details.bg}`}
                          >
                            <Icon className={`h-4 w-4 ${details.fg}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground text-sm font-medium">
                              {details.label}
                            </p>
                            <p className="text-muted-foreground text-[11px]">
                              {formatDistanceToNow(bookmark.createdAt, {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          <ChevronRight className="text-muted-foreground/60 h-4 w-4 shrink-0" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default Bookmarks;
