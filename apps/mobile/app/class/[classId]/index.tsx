import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  Bookmark,
  Download,
  ExternalLink,
  FileVideo,
  Trash2,
} from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { PageHeader } from "~/components/ui/PageHeader";
import { Screen } from "~/components/ui/Screen";
import { SectionHeader } from "~/components/ui/SectionHeader";
import { AssignmentCard } from "~/features/assignments/AssignmentCard";
import { NoteComposer } from "~/features/notes/NoteComposer";
import {
  useBookmarkActions,
  useClassDetails,
  useNotesActions,
  useObjectBookmark,
  useObjectNote,
} from "~/lib/api/hooks";
import { selectClass } from "~/lib/api/mobile-selectors";
import { unwrapData } from "~/lib/api/normalizers";
import { isCacheableMediaUrl } from "~/lib/media/media-cache";
import { useMediaCache } from "~/lib/media/use-media-cache";
import { spacing } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";
import { openWebPath } from "~/lib/web-handoff";

export default function ClassDetailScreen() {
  const { colors } = useTheme();
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const classQuery = useClassDetails(classId);
  const classItem = selectClass(classQuery.data);
  const noteQuery = useObjectNote(classId);
  const bookmarkQuery = useObjectBookmark(classId);
  const notesActions = useNotesActions();
  const bookmarkActions = useBookmarkActions();
  const note = unwrapData<{
    description?: string | null;
    tags?: string[];
  }>(noteQuery.data);
  const bookmark = unwrapData(bookmarkQuery.data);
  const videoLink = classItem?.video?.videoLink;
  const canCache = isCacheableMediaUrl(videoLink);
  const mediaCache = useMediaCache({
    cacheKey: `class-${classId}`,
    remoteUrl: videoLink,
    title: classItem?.title || "Class recording",
  });

  return (
    <Screen
      onRefresh={() => void classQuery.refetch()}
      refreshing={classQuery.isFetching}
    >
      <Stack.Screen options={{ title: classItem?.title || "Class" }} />
      <PageHeader showBack title={classItem?.title || "Class"} />

      <Card elevated style={styles.videoCard}>
        <View style={[styles.videoIcon, { backgroundColor: `${colors.primary}10` }]}>
          <FileVideo color={colors.primary} size={28} strokeWidth={2} />
        </View>
        <View style={styles.videoCopy}>
          <Chip tone={classItem?.classType === "LIVE" ? "coral" : "primary"}>
            {classItem?.classType === "LIVE" ? "Live class" : "Recording"}
          </Chip>
          <AppText variant="subtitle">
            {classItem?.video?.videoType || "Class media"}
          </AppText>
        </View>
        <View style={styles.actions}>
          {videoLink ? (
            <Button
              icon={ExternalLink}
              onPress={() =>
                openWebPath(
                  `/courses/${classItem?.courseId}/classes/${classId}`,
                )
              }
            >
              Open in browser
            </Button>
          ) : null}
          <Button
            icon={Bookmark}
            loading={bookmarkActions.toggleBookmark.isPending}
            onPress={() =>
              bookmarkActions.toggleBookmark.mutate({
                category: "CLASS",
                objectId: classId,
                causedObjects: classItem?.courseId
                  ? { courseId: classItem.courseId, classId }
                  : { classId },
              })
            }
            tone={bookmark ? "secondary" : "ghost"}
          >
            {bookmark ? "Bookmarked" : "Bookmark"}
          </Button>
          {canCache && !mediaCache.cached ? (
            <Button
              icon={Download}
              loading={mediaCache.loading}
              onPress={mediaCache.save}
              tone="secondary"
            >
              Download
            </Button>
          ) : null}
          {mediaCache.cached ? (
            <Button
              icon={Trash2}
              loading={mediaCache.loading}
              onPress={mediaCache.remove}
              tone="ghost"
            >
              Remove download
            </Button>
          ) : null}
        </View>
      </Card>

      {mediaCache.cached ? (
        <Card style={styles.downloaded}>
          <Download color={colors.success} size={17} />
          <AppText variant="body">Downloaded</AppText>
        </Card>
      ) : null}

      <NoteComposer
        category="CLASS"
        initialDescription={note?.description}
        initialTags={note?.tags}
        objectId={classId}
        onClear={async () => {
          await notesActions.saveNote.mutateAsync({
            category: "CLASS",
            objectId: classId,
            description: null,
            tags: [],
            causedObjects: classItem?.courseId
              ? { classId, courseId: classItem.courseId }
              : { classId },
          });
        }}
        onSave={async ({ description, tags }) => {
          await notesActions.saveNote.mutateAsync({
            category: "CLASS",
            objectId: classId,
            description,
            tags,
            causedObjects: classItem?.courseId
              ? { classId, courseId: classItem.courseId }
              : { classId },
          });
        }}
        saving={notesActions.saveNote.isPending}
      />

      <View style={styles.section}>
        <SectionHeader
          action={`${classItem?.attachments?.length ?? 0}`}
          title="Assignments"
        />
        {classItem?.attachments?.map((assignment) => (
          <AssignmentCard assignment={assignment} key={assignment.id} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  videoCard: {
    gap: spacing.md,
  },
  videoIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  videoCopy: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
  },
  downloaded: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
});
