"use client";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import { NotesComponent } from "./_components/Notes";

export default function NotesPage() {
  const q = api.notes.getNotes.useQuery();
  if (q.isLoading) return <PageLoader />;
  return <NotesComponent notes={q.data?.data ?? []} />;
}
