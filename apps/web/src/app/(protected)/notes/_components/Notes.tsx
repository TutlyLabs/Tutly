"use client";

import type { NoteCategory, Notes } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, FileQuestion, ScrollText } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

import ContentPreview from "@/components/ContentPreview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

    const matchesDescription = note.description?.toLowerCase().includes(searchLower);

    const matchesJsonContent = note.descriptionJson && typeof note.descriptionJson === 'object'
      ? JSON.stringify(note.descriptionJson).toLowerCase().includes(searchLower)
      : false;

    const matchesTags = note.tags.some((tag) =>
      tag.toLowerCase().includes(searchLower)
    );

    const matchesSearch = matchesDescription || matchesJsonContent || matchesTags;

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
    <div className="w-full space-y-4 p-2 sm:p-4">
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
              className={`rounded-full px-2 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm ${selectedTags.includes(tag)
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
                }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="ALL" className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="flex min-w-max">
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="flex-1 px-2 py-1 text-xs whitespace-nowrap sm:px-3 sm:py-1.5 sm:text-sm"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {categories.map((category) => (
          <TabsContent key={category} value={category}>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredNotes
                .filter(
                  (note) => category === "ALL" || note.category === category,
                )
                .map((note) => {
                  const details = getNoteDetails(
                    note.category,
                    note.objectId,
                    note.causedObjects as unknown as CausedObjects,
                  );
                  const Icon = details.icon;

                  return (
                    <Card key={note.id}>
                      <CardHeader className="flex flex-row items-center gap-2 py-2 sm:gap-4 sm:py-3">
                        <div
                          className={`bg-muted rounded-full p-1.5 ${details.style}`}
                        >
                          <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                        </div>
                        <div className="flex flex-1 flex-wrap items-center gap-1 sm:gap-2">
                          <CardTitle className="text-xs sm:text-sm">
                            {details.label}
                          </CardTitle>
                          <CardDescription className="xs:inline hidden text-xs">
                            {formatDistanceToNow(note.createdAt, {
                              addSuffix: true,
                            })}
                          </CardDescription>
                          <Link
                            href={details.href}
                            className="text-muted-foreground hover:text-primary ml-auto text-xs transition-colors"
                          >
                            View
                          </Link>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 py-2">
                        <div className="prose dark:prose-invert max-w-none">
                          <ContentPreview
                            content={note.description || ""}
                            jsonContent={note.descriptionJson}
                            className="text-xs sm:text-sm"
                          />
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {note.tags.map((tag) => (
                            <span
                              key={tag}
                              className="bg-secondary text-secondary-foreground rounded-full px-1.5 py-0.5 text-xs sm:px-2"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
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
