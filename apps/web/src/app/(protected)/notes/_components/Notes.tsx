"use client";

import type { NoteCategory, Notes } from "@tutly/db/browser";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, FileQuestion, NotebookPen, ScrollText } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

import ContentPreview from "@/components/ContentPreview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@tutly/ui/card";
import { Input } from "@tutly/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tutly/ui/tabs";

interface CausedObjects {
  courseId: string;
  classId: string;
}

const getNoteDetails = (
  category: NoteCategory,
  objectId: string,
  causedObjects: CausedObjects,
) => {
  const config = {
    ASSIGNMENT: {
      icon: ScrollText,
      href: `/assignments/detail?id=${objectId}`,
      style: "text-yellow-500",
      label: "Assignment",
    },
    CLASS: {
      icon: BookOpen,
      href: `/courses/class?id=${causedObjects?.courseId}&classId=${objectId}`,
      style: "text-blue-500",
      label: "Class",
    },
    DOUBT: {
      icon: FileQuestion,
      href: `/doubts/${objectId}`,
      style: "text-green-500",
      label: "Doubt",
    },
  };

  return config[category];
};

export const NotesComponent = ({ notes }: { notes: Notes[] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const categories = [
    "ALL",
    ...Array.from(new Set(notes.map((n) => n.category))),
  ];
  const allTags = Array.from(new Set(notes.flatMap((note) => note.tags)));

  const filteredNotes = notes.filter((note) => {
    const searchLower = searchTerm.toLowerCase();

    const matchesDescription = note.description
      ?.toLowerCase()
      .includes(searchLower);

    const matchesJsonContent =
      note.descriptionJson && typeof note.descriptionJson === "object"
        ? JSON.stringify(note.descriptionJson)
            .toLowerCase()
            .includes(searchLower)
        : false;

    const matchesTags = note.tags.some((tag) =>
      tag.toLowerCase().includes(searchLower),
    );

    const matchesSearch =
      matchesDescription || matchesJsonContent || matchesTags;

    const matchesSelectedTags =
      selectedTags.length === 0 ||
      selectedTags.every((tag) => note.tags.includes(tag));

    return matchesSearch && matchesSelectedTags;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex flex-col gap-3">
        <Input
          placeholder="Search notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />

        <div className="flex flex-wrap gap-1 sm:gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-2 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm ${
                selectedTags.includes(tag)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="ALL" className="w-full space-y-3">
        <div className="-mx-3 overflow-x-auto pb-2 sm:mx-0">
          <TabsList className="bg-muted/40 mx-3 inline-flex h-9 w-max items-center gap-1 rounded-lg p-1 sm:mx-0">
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="data-[state=active]:bg-background data-[state=active]:text-foreground h-7 rounded-md px-3 text-xs font-medium whitespace-nowrap data-[state=active]:shadow-sm"
              >
                {category.charAt(0) + category.slice(1).toLowerCase()}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {categories.map((category) => {
          const visibleNotes = filteredNotes.filter(
            (note) => category === "ALL" || note.category === category,
          );
          return (
            <TabsContent key={category} value={category} className="m-0">
              {visibleNotes.length === 0 ? (
                <NotesEmptyState
                  hasNotes={notes.length > 0}
                  hasSearch={searchTerm.length > 0 || selectedTags.length > 0}
                  category={category}
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleNotes.map((note) => {
                    const details = getNoteDetails(
                      note.category,
                      note.objectId,
                      note.causedObjects as unknown as CausedObjects,
                    );
                    const Icon = details.icon;

                    return (
                      <Card
                        key={note.id}
                        className="bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`bg-muted/60 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${details.style}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground text-sm font-medium">
                              {details.label}
                            </p>
                            <p className="text-muted-foreground text-[11px]">
                              {formatDistanceToNow(note.createdAt, {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          <Link
                            href={details.href}
                            className="text-muted-foreground hover:text-primary text-xs font-medium transition-colors"
                          >
                            View
                          </Link>
                        </div>
                        <div className="prose prose-sm dark:prose-invert text-foreground/90 max-w-none">
                          <ContentPreview
                            content={note.description || ""}
                            jsonContent={note.descriptionJson}
                            className="text-xs sm:text-sm"
                          />
                        </div>
                        {note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {note.tags.map((tag) => (
                              <span
                                key={tag}
                                className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

function NotesEmptyState({
  hasNotes,
  hasSearch,
  category,
}: {
  hasNotes: boolean;
  hasSearch: boolean;
  category: string;
}) {
  const heading = hasSearch
    ? "No notes match your filters"
    : hasNotes
      ? `No ${category === "ALL" ? "" : category.toLowerCase()} notes yet`.replace(
          /\s+/g,
          " ",
        )
      : "No notes yet";

  const message = hasSearch
    ? "Try clearing the search or tag filters to see all your notes."
    : "Open any class, assignment, or doubt and use the note icon to save what you want to revisit. Your saved notes will show up here.";

  return (
    <div className="border-border bg-card/40 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <div className="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-full">
        <NotebookPen className="h-5 w-5" />
      </div>
      <div>
        <p className="text-foreground text-sm font-semibold">{heading}</p>
        <p className="text-muted-foreground mx-auto mt-1 max-w-md text-xs">
          {message}
        </p>
      </div>
    </div>
  );
}
