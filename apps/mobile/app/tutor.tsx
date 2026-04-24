import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { Activity, ClipboardList, UsersRound } from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { EmptyState } from "~/components/ui/EmptyState";
import { MetricCard } from "~/components/ui/MetricCard";
import { PageHeader } from "~/components/ui/PageHeader";
import { Screen } from "~/components/ui/Screen";
import { SectionHeader } from "~/components/ui/SectionHeader";
import {
  useAssignments,
  useDashboard,
  useTutorActivity,
  useTutorUsers,
} from "~/lib/api/hooks";
import {
  selectAssignments,
  selectDashboardCourses,
} from "~/lib/api/mobile-selectors";
import { unwrapData } from "~/lib/api/normalizers";
import { useAuth } from "~/lib/auth/auth-provider";
import { spacing } from "~/lib/theme/tokens";

type TutorUser = {
  id: string;
  name?: string | null;
  username?: string | null;
  role?: string;
  lastSeen?: string | Date | null;
};

export default function TutorScreen() {
  const { user } = useAuth();
  const dashboardQuery = useDashboard();
  const assignmentsQuery = useAssignments();
  const activityQuery = useTutorActivity();
  const usersQuery = useTutorUsers();
  const courses = selectDashboardCourses(dashboardQuery.data);
  const assignments = selectAssignments(assignmentsQuery.data);
  const activityData = unwrapData<{
    users?: TutorUser[];
    totalItems?: number;
    activeCount?: number;
  }>(activityQuery.data);
  const manageData = unwrapData<{ users?: TutorUser[]; totalItems?: number }>(
    usersQuery.data,
  );
  const tutorAllowed =
    user?.role === "MENTOR" ||
    user?.role === "INSTRUCTOR" ||
    user?.role === "ADMIN";

  return (
    <Screen
      onRefresh={() => {
        void dashboardQuery.refetch();
        void assignmentsQuery.refetch();
        void activityQuery.refetch();
        void usersQuery.refetch();
      }}
      refreshing={
        dashboardQuery.isFetching ||
        assignmentsQuery.isFetching ||
        activityQuery.isFetching ||
        usersQuery.isFetching
      }
    >
      <Stack.Screen options={{ title: "Instructor" }} />
      <PageHeader showBack title="Instructor" />
      {!tutorAllowed ? (
        <EmptyState
          body="This area is for mentors, instructors, and admins."
          icon={UsersRound}
          title="Not available"
        />
      ) : (
        <>
          <View style={styles.metrics}>
            <MetricCard
              helper="active"
              icon={ClipboardList}
              label="Courses"
              value={courses.length}
              tone="primary"
            />
            <MetricCard
              helper="total"
              icon={Activity}
              label="Assignments"
              value={assignments.length}
              tone="amber"
            />
          </View>
          <View style={styles.metrics}>
            <MetricCard
              helper="online"
              icon={UsersRound}
              label="Active"
              value={activityData?.activeCount ?? 0}
              tone="sky"
            />
            <MetricCard
              helper="managed"
              icon={UsersRound}
              label="Users"
              value={manageData?.totalItems ?? activityData?.totalItems ?? 0}
              tone="plum"
            />
          </View>

          <View style={styles.section}>
            <SectionHeader title="Recent learners" />
            {(activityData?.users ?? manageData?.users ?? [])
              .slice(0, 6)
              .map((item) => (
                <Card key={item.id} style={styles.userCard}>
                  <View style={styles.userCopy}>
                    <Chip tone={item.role === "MENTOR" ? "plum" : "primary"}>
                      {item.role || "USER"}
                    </Chip>
                    <AppText variant="subtitle">
                      {item.name || item.username}
                    </AppText>
                    <AppText muted variant="caption">
                      {item.lastSeen
                        ? `Last seen ${new Date(item.lastSeen).toLocaleString()}`
                        : "No recent activity"}
                    </AppText>
                  </View>
                </Card>
              ))}
          </View>
        </>
      )}
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
  userCard: {
    gap: spacing.xs,
  },
  userCopy: {
    gap: spacing.xs,
  },
});
