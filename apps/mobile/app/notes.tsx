import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router, Stack } from "expo-router";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  StickyNote,
} from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { EmptyState } from "~/components/ui/EmptyState";
import { PageHeader } from "~/components/ui/PageHeader";
import { Screen } from "~/components/ui/Screen";
import { NoteComposer } from "~/features/notes/NoteComposer";
import {
  useAssignments,
  useAttendanceOverview,
  useCourses,
  useNotes,
  useNotesActions,
} from "~/lib/api/hooks";
import { selectAssignments, selectCourses } from "~/lib/api/mobile-selectors";
import { asArray, unwrapData } from "~/lib/api/normalizers";
import {
  buildSavedItemCatalog,
  formatSavedCategory,
  resolveSavedItem,
} from "~/lib/navigation/saved-items";

import { openWebPath } from "~/lib/web-handoff";

type NoteItem = {
  id: string;
  category: string;
  objectId: string;
  description?: string | null;
  tags?: string[];
  updatedAt?: string | Date;
  causedObjects?: Record<string, string>;
};

type AttendanceCourse = {
  id: string;
  title: string;
  classes?: Array<{ id: string; title: string }>;
};

export default function NotesScreen() {
  const notesQuery = useNotes();
  const notesActions = useNotesActions();
  const assignmentsQuery = useAssignments();
  const coursesQuery = useCourses();
  const attendanceQuery = useAttendanceOverview();
  const notes = asArray<NoteItem>(notesQuery.data);
  const assignments = selectAssignments(assignmentsQuery.data);
  const courses = selectCourses(coursesQuery.data);
  const attendanceData = unwrapData<{ courses?: AttendanceCourse[] }>(
    attendanceQuery.data,
  );
  const classes = useMemo(
    () =>
      (attendanceData?.courses ?? []).flatMap((course) =>
        (course.classes ?? []).map((item) => ({
          courseId: course.id,
          id: item.id,
          title: item.title,
        })),
      ),
    [attendanceData?.courses],
  );
  const catalog = useMemo(
    () => buildSavedItemCatalog({ assignments, classes, courses }),
    [assignments, classes, courses],
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Screen
      onRefresh={() => void notesQuery.refetch()}
      refreshing={notesQuery.isFetching}
    >
      <Stack.Screen options={{ title: "Notes" }} />
      <PageHeader showBack title="Notes" />
      <View className="gap-sm">
        {notes.map((note) => {
          const resolved = resolveSavedItem(note, catalog);
          const href = resolved.href;

          return (
            <Card key={note.id} className="gap-sm">
              <Pressable
                onPress={() =>
                  setExpandedId((current) =>
                    current === note.id ? null : note.id,
                  )
                }
              >
                {({ pressed }) => (
                  <View className="flex-row items-start gap-sm justify-between" style={pressed ? { opacity: 0.7 } : undefined}>
                    <View className="flex-1 gap-sm">
                      <View className="flex-row flex-wrap gap-xs">
                        <Chip tone="amber">
                          {formatSavedCategory(note.category)}
                        </Chip>
                        {note.tags?.slice(0, 3).map((tag) => (
                          <Chip key={tag} tone="neutral">
                            {tag}
                          </Chip>
                        ))}
                      </View>
                      <AppText variant="subtitle">{resolved.title}</AppText>
                      <AppText muted variant="caption">
                        {resolved.subtitle}
                      </AppText>
                      <AppText
                        muted
                        numberOfLines={expandedId === note.id ? 12 : 3}
                      >
                        {note.description || "No description"}
                      </AppText>
                      {note.updatedAt ? (
                        <AppText muted variant="caption">
                          {new Date(note.updatedAt).toLocaleString()}
                        </AppText>
                      ) : null}
                    </View>
                    {expandedId === note.id ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </View>
                )}
              </Pressable>
              {expandedId === note.id ? (
                <>
                  <View className="flex-row gap-sm">
                    {href ? (
                      <Button
                        icon={ExternalLink}
                        onPress={() => router.push(href)}
                        tone="secondary"
                      >
                        Open
                      </Button>
                    ) : resolved.fallbackWebPath ? (
                      <Button
                        icon={ExternalLink}
                        onPress={() =>
                          openWebPath(resolved.fallbackWebPath || "/notes")
                        }
                        tone="secondary"
                      >
                        Open
                      </Button>
                    ) : null}
                  </View>
                  <NoteComposer
                    category={note.category as "CLASS" | "ASSIGNMENT" | "DOUBT"}
                    embedded
                    initialDescription={note.description}
                    initialTags={note.tags}
                    objectId={note.objectId}
                    onClear={async () => {
                      await notesActions.saveNote.mutateAsync({
                        category: note.category as
                          | "CLASS"
                          | "ASSIGNMENT"
                          | "DOUBT",
                        objectId: note.objectId,
                        description: null,
                        tags: [],
                      });
                    }}
                    onSave={async ({ description, tags }) => {
                      await notesActions.saveNote.mutateAsync({
                        category: note.category as
                          | "CLASS"
                          | "ASSIGNMENT"
                          | "DOUBT",
                        objectId: note.objectId,
                        description,
                        tags,
                      });
                    }}
                    saving={notesActions.saveNote.isPending}
                    title="Edit note"
                  />
                </>
              ) : null}
            </Card>
          );
        })}
      </View>
      {!notes.length && !notesQuery.isLoading ? (
        <EmptyState
          body="Your notes will appear here."
          icon={StickyNote}
          title="No notes yet"
        />
      ) : null}
    </Screen>
  );
}
