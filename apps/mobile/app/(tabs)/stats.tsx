import { StyleSheet, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, BarChart3, BookOpen, FileCheck2 } from "lucide-react-native";

import { Card } from "~/components/ui/Card";
import { EmptyState } from "~/components/ui/EmptyState";
import { MetricCard } from "~/components/ui/MetricCard";
import { PageHeader } from "~/components/ui/PageHeader";
import { Screen } from "~/components/ui/Screen";
import { SectionHeader } from "~/components/ui/SectionHeader";
import { SimpleBars } from "~/features/stats/SimpleBars";
import { useAssignments, useCourses, useDashboard } from "~/lib/api/hooks";
import {
  selectAssignments,
  selectCourses,
  selectDashboardCourses,
} from "~/lib/api/mobile-selectors";
import { queryKeys } from "~/lib/api/query-keys";
import { spacing } from "~/lib/theme/tokens";

export default function StatsScreen() {
  const queryClient = useQueryClient();
  const dashboardQuery = useDashboard();
  const coursesQuery = useCourses();
  const assignmentsQuery = useAssignments();
  const courses = selectCourses(coursesQuery.data);
  const dashboardCourses = selectDashboardCourses(dashboardQuery.data);
  const assignments = selectAssignments(assignmentsQuery.data);
  const submitted = assignments.filter(
    (item) => item.submissions?.length,
  ).length;
  const completion = assignments.length
    ? Math.round((submitted / assignments.length) * 100)
    : 0;

  const bars = dashboardCourses.slice(0, 6).map((course, index) => ({
    label: String(course.courseTitle || course.title || `Course ${index + 1}`),
    value: Number(
      course.totalPoints ??
        course.evaluatedAssignments ??
        course.classCount ??
        0,
    ),
    tone: (["primary", "amber", "coral", "sky", "plum"] as const)[index % 5],
  }));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.courses });
    void queryClient.invalidateQueries({ queryKey: queryKeys.assignments() });
  };

  return (
    <Screen
      onRefresh={refresh}
      refreshing={
        dashboardQuery.isFetching ||
        coursesQuery.isFetching ||
        assignmentsQuery.isFetching
      }
    >
      <PageHeader title="Stats" />

      <View style={styles.metricGrid}>
        <MetricCard
          helper="progress"
          icon={FileCheck2}
          label="Completion"
          value={`${completion}%`}
          tone="primary"
        />
        <MetricCard
          helper="enrolled"
          icon={BookOpen}
          label="Courses"
          value={courses.length}
          tone="sky"
        />
      </View>

      <Card style={styles.chartCard}>
        <SectionHeader title="Course overview" />
        {bars.length ? (
          <SimpleBars items={bars} />
        ) : (
          <EmptyState
            body="Stats will appear after data loads."
            icon={Activity}
            title="No stats yet"
          />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metricGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  chartCard: {
    gap: spacing.md,
  },
});
