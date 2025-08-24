import { NotesComponent } from "./_components/Notes";
import { api } from "@/trpc/server";

export default async function NotesPage() {
  const notes = await api.notes.getNotes();

  return (
    <div className="container mx-auto py-6">
      <NotesComponent notes={notes.data ?? []} />
    </div>
  );
}
