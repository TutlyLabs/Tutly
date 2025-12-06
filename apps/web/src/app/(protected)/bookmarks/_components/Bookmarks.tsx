"use client";

import type { BookMarkCategory, BookMarks } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { Bell, BookOpen, FileQuestion, ScrollText } from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      href: `/assignments/${objectId}`,
      style: "text-yellow-500",
      label: "Assignment",
    },
    CLASS: {
      icon: BookOpen,
      href: `/courses/${causedObjects?.courseId}/classes/${objectId}`,
      style: "text-blue-500",
      label: "Class",
    },
    DOUBT: {
      icon: FileQuestion,
      href: `/doubts/${objectId}`,
      style: "text-green-500",
      label: "Doubt",
    },
    NOTIFICATION: {
      icon: Bell,
      href: `/notifications/${objectId}`,
      style: "text-purple-500",
      label: "Notification",
    },
  };

  return config[category];
};

const Bookmarks = ({ bookmarks }: { bookmarks: BookMarks[] }) => {
  const categories = ["ALL", ...new Set(bookmarks.map((b) => b.category))];

  return (
    <div className="w-full p-4">
      <Tabs defaultValue="ALL" className="w-full">
        <TabsList className="flex justify-center">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="flex-1">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bookmarks
                .filter(
                  (bookmark) =>
                    category === "ALL" || bookmark.category === category,
                )
                .map((bookmark) => {
                  const details = getBookmarkDetails(
                    bookmark.category,
                    bookmark.objectId,
                    bookmark.causedObjects as unknown as CausedObjects,
                  );
                  const Icon = details.icon;

                  return (
                    <Card key={bookmark.id}>
                      <CardHeader className="flex flex-row items-center gap-4">
                        <div
                          className={`bg-muted rounded-full p-2 ${details.style} ${
                            // Smaller icon for mobile view
                            "sm:h-7 sm:w-7 sm:p-1"
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle>{details.label}</CardTitle>
                          <CardDescription>
                            {formatDistanceToNow(bookmark.createdAt, {
                              addSuffix: true,
                            })}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Link
                          href={details.href}
                          className="text-muted-foreground hover:text-primary text-sm transition-colors"
                        >
                          View {details.label}
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Bookmarks;
