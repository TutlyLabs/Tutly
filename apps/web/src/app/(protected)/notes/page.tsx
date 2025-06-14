"use client";

import { NotesComponent } from "./_components/Notes";
import { api } from "@/trpc/react";

export default function NotesPage() {
  const notes = api.notes.getNotes.useQuery();

  return (
    <div className="container mx-auto py-6">
      <NotesComponent notes={notes.data?.data ?? []} />
    </div>
  );
} 