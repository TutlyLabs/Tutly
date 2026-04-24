import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { ClipboardCheck, PlayCircle } from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { EmptyState } from "~/components/ui/EmptyState";
import { MetricCard } from "~/components/ui/MetricCard";
import { PageHeader } from "~/components/ui/PageHeader";
import { Screen } from "~/components/ui/Screen";
import { SectionHeader } from "~/components/ui/SectionHeader";
import { useAttendanceOverview } from "~/lib/api/hooks";
import { unwrapData } from "~/lib/api/normalizers";
import { spacing } from "~/lib/theme/tokens";

type AttendanceCourse = {
  id: string;
  title: string;
  classes?: Array<{ id: string; title: string; createdAt?: string | Date }>;
  _count?: { classes?: number };
};

export default function AttendanceScreen() {
  const attendanceQuery = useAttendanceOverview();
  const data = unwrapData<{
    courses?: AttendanceCourse[];
    role?: string;
  }>(attendanceQuery.data);
  const courses = data?.courses ?? [];
  const totalClasses = courses.reduce(
    (sum, course) =>
      sum + (course._count?.classes ?? course.classes?.length ?? 0),
    0,
  );

  return (
    <Screen
      onRefresh={() => void attendanceQuery.refetch()}
      refreshing={attendanceQuery.isFetching}
    >
      <Stack.Screen options={{ title: "Attendance" }} />
      <PageHeader showBack title="Attendance" />
      <View style={styles.metrics}>
        <MetricCard
          helper="enrolled"
          icon={ClipboardCheck}
          label="Courses"
          value={courses.length}
          tone="primary"
        />
        <MetricCard
          helper="total"
          icon={PlayCircle}
          label="Classes"
          value={totalClasses}
          tone="sky"
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Course attendance" />
        {courses.map((course) => (
          <Card key={course.id} style={styles.courseCard}>
            <Chip tone="primary">
              {course._count?.classes ?? course.classes?.length ?? 0} classes
            </Chip>
            <AppText variant="subtitle">{course.title}</AppText>
          </Card>
        ))}
      </View>

      {!courses.length && !attendanceQuery.isLoading ? (
        <EmptyState
          body="Your attendance will appear here."
          icon={ClipboardCheck}
          title="No attendance data yet"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  courseCard: {
    gap: spacing.sm,
  },
});
