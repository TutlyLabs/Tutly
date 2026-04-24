import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  Bookmark,
  CalendarClock,
  ExternalLink,
  FileText,
  NotebookPen,
  Send,
} from "lucide-react-native";

import type { AssignmentSummary } from "~/types/tutly";
import { AppText } from "~/components/ui/AppText";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { PageHeader } from "~/components/ui/PageHeader";
import { Screen } from "~/components/ui/Screen";
import { NoteComposer } from "~/features/notes/NoteComposer";
import {
  useAssignmentDetails,
  useBookmarkActions,
  useNotesActions,
  useObjectBookmark,
  useObjectNote,
} from "~/lib/api/hooks";
import { unwrapData } from "~/lib/api/normalizers";
import { spacing } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";
import { openWebPath } from "~/lib/web-handoff";

export default function AssignmentDetailScreen() {
  const { colors } = useTheme();
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const assignmentQuery = useAssignmentDetails(assignmentId);
  const noteQuery = useObjectNote(assignmentId);
  const bookmarkQuery = useObjectBookmark(assignmentId);
  const notesActions = useNotesActions();
  const bookmarkActions = useBookmarkActions();
  const assignment = assignmentQuery.data as
    | AssignmentSummary
    | null
    | undefined;
  const note = unwrapData<{
    description?: string | null;
    tags?: string[];
  }>(noteQuery.data);
  const bookmark = unwrapData(bookmarkQuery.data);

  return (
    <Screen
      onRefresh={() => void assignmentQuery.refetch()}
      refreshing={assignmentQuery.isFetching}
    >
      <Stack.Screen options={{ title: assignment?.title || "Assignment" }} />
      <PageHeader showBack title={assignment?.title || "Assignment"} />

      <Card elevated style={styles.card}>
        <View style={[styles.icon, { backgroundColor: `${colors.primary}10` }]}>
          <FileText color={colors.primary} size={26} strokeWidth={2} />
        </View>
        <Chip tone="amber">View only</Chip>
        <AppText variant="title">{assignment?.title || "Assignment"}</AppText>
        <View style={styles.meta}>
          <CalendarClock color={colors.inkMuted} size={17} />
          <AppText muted>
            {assignment?.dueDate
              ? `Due ${new Date(assignment.dueDate).toLocaleString()}`
              : "No due date"}
          </AppText>
        </View>
        <Button
          icon={Bookmark}
          loading={bookmarkActions.toggleBookmark.isPending}
          onPress={() =>
            bookmarkActions.toggleBookmark.mutate({
              category: "ASSIGNMENT",
              objectId: assignmentId,
              causedObjects: assignment?.class?.course?.id
                ? {
                    assignmentId,
                    classId: assignment?.class?.id || "",
                    courseId: assignment.class.course.id,
                  }
                : { assignmentId },
            })
          }
          tone={bookmark ? "secondary" : "ghost"}
        >
          {bookmark ? "Bookmarked" : "Bookmark"}
        </Button>
        <Button
          icon={Send}
          onPress={() => openWebPath(`/assignments/${assignmentId}`)}
        >
          Open in browser
        </Button>
        {assignment?.link ? (
          <Button
            icon={ExternalLink}
            onPress={() => openWebPath(assignment.link || "")}
            tone="secondary"
          >
            Open assignment link
          </Button>
        ) : null}
      </Card>

      <NoteComposer
        category="ASSIGNMENT"
        initialDescription={note?.description}
        initialTags={note?.tags}
        objectId={assignmentId}
        onClear={async () => {
          await notesActions.saveNote.mutateAsync({
            category: "ASSIGNMENT",
            objectId: assignmentId,
            description: null,
            tags: [],
            causedObjects: assignment?.class?.course?.id
              ? {
                  assignmentId,
                  classId: assignment?.class?.id || "",
                  courseId: assignment.class.course.id,
                }
              : { assignmentId },
          });
        }}
        onSave={async ({ description, tags }) => {
          await notesActions.saveNote.mutateAsync({
            category: "ASSIGNMENT",
            objectId: assignmentId,
            description,
            tags,
            causedObjects: assignment?.class?.course?.id
              ? {
                  assignmentId,
                  classId: assignment?.class?.id || "",
                  courseId: assignment.class.course.id,
                }
              : { assignmentId },
          });
        }}
        saving={notesActions.saveNote.isPending}
        title="Assignment notes"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  icon: {
    alignItems: "center",
    borderRadius: 20,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  meta: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
});
