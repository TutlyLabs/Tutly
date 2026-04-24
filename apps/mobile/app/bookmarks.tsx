import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { router, Stack } from "expo-router";
import { BookMarked, ExternalLink, Trash2 } from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { EmptyState } from "~/components/ui/EmptyState";
import { PageHeader } from "~/components/ui/PageHeader";
import { Screen } from "~/components/ui/Screen";
import {
  useAssignments,
  useAttendanceOverview,
  useBookmarkActions,
  useBookmarks,
  useCourses,
} from "~/lib/api/hooks";
import { selectAssignments, selectCourses } from "~/lib/api/mobile-selectors";
import { asArray, unwrapData } from "~/lib/api/normalizers";
import {
  buildSavedItemCatalog,
  formatSavedCategory,
  resolveSavedItem,
} from "~/lib/navigation/saved-items";
import { spacing } from "~/lib/theme/tokens";
import { openWebPath } from "~/lib/web-handoff";

type AttendanceCourse = {
  id: string;
  title: string;
  classes?: Array<{ id: string; title: string }>;
};

export default function BookmarksScreen() {
  const bookmarksQuery = useBookmarks();
  const bookmarkActions = useBookmarkActions();
  const assignmentsQuery = useAssignments();
  const coursesQuery = useCourses();
  const attendanceQuery = useAttendanceOverview();
  const bookmarks = asArray<{
    id: string;
    category: string;
    objectId: string;
    causedObjects?: Record<string, string>;
    createdAt?: string | Date;
  }>(bookmarksQuery.data);
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

  return (
    <Screen
      onRefresh={() => void bookmarksQuery.refetch()}
      refreshing={bookmarksQuery.isFetching}
    >
      <Stack.Screen options={{ title: "Bookmarks" }} />
      <PageHeader showBack title="Bookmarks" />
      <View style={styles.list}>
        {bookmarks.map((item) => (
          <Card key={item.id} style={styles.card}>
            {(() => {
              const resolved = resolveSavedItem(item, catalog);
              const href = resolved.href;

              return (
                <>
                  <View style={styles.top}>
                    <Chip tone="plum">
                      {formatSavedCategory(item.category)}
                    </Chip>
                    <AppText muted variant="caption">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : ""}
                    </AppText>
                  </View>
                  <AppText variant="subtitle">{resolved.title}</AppText>
                  <AppText muted>{resolved.subtitle}</AppText>
                  <View style={styles.actions}>
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
                          openWebPath(resolved.fallbackWebPath || "/bookmarks")
                        }
                        tone="secondary"
                      >
                        Open
                      </Button>
                    ) : null}
                    <Button
                      icon={Trash2}
                      loading={bookmarkActions.toggleBookmark.isPending}
                      onPress={() =>
                        bookmarkActions.toggleBookmark.mutate({
                          category: item.category as
                            | "ASSIGNMENT"
                            | "CLASS"
                            | "DOUBT"
                            | "NOTIFICATION",
                          causedObjects: item.causedObjects,
                          objectId: item.objectId,
                        })
                      }
                      tone="ghost"
                    >
                      Remove
                    </Button>
                  </View>
                </>
              );
            })()}
          </Card>
        ))}
      </View>
      {!bookmarks.length && !bookmarksQuery.isLoading ? (
        <EmptyState
          body="Your bookmarked items will appear here."
          icon={BookMarked}
          title="No bookmarks yet"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  card: {
    gap: spacing.sm,
  },
  top: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
