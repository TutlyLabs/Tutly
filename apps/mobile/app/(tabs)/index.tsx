import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  NotebookPen,
  ShieldCheck,
  Trophy,
  UserRound,
} from "lucide-react-native";

import { ActionTile } from "~/components/ui/ActionTile";
import { AppText } from "~/components/ui/AppText";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { MetricCard } from "~/components/ui/MetricCard";
import { PageHeader } from "~/components/ui/PageHeader";
import { ProgressRing } from "~/components/ui/ProgressRing";
import { Screen } from "~/components/ui/Screen";
import { SectionHeader } from "~/components/ui/SectionHeader";
import { AssignmentCard } from "~/features/assignments/AssignmentCard";
import { CourseCard } from "~/features/courses/CourseCard";
import { EventCard } from "~/features/schedule/EventCard";
import { useAssignments, useDashboard, useSchedule } from "~/lib/api/hooks";
import {
  selectAssignments,
  selectDashboardCourses,
  selectScheduleEvents,
} from "~/lib/api/mobile-selectors";
import { queryKeys } from "~/lib/api/query-keys";
import { useAuth } from "~/lib/auth/auth-provider";
import { radius, shadows, spacing } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dashboard = useDashboard();
  const assignmentsQuery = useAssignments();
  const scheduleQuery = useSchedule();
  const dashboardCourses = selectDashboardCourses(dashboard.data);
  const assignments = selectAssignments(assignmentsQuery.data);
  const events = selectScheduleEvents(scheduleQuery.data);
  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return [...events]
      .filter((event) => new Date(event.startDate).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
  }, [events]);

  const submittedAssignments = assignments.filter(
    (assignment) => assignment.submissions?.length,
  ).length;
  const totalPoints = dashboardCourses.reduce((sum, course) => {
    const points = Number(course.totalPoints ?? 0);
    return sum + points;
  }, 0);
  const completionPct = assignments.length
    ? Math.round((submittedAssignments / assignments.length) * 100)
    : 0;
  const isTutor =
    user?.role === "MENTOR" ||
    user?.role === "INSTRUCTOR" ||
    user?.role === "ADMIN";

  const quickActions = [
    { title: "Notes", helper: "Your notes", icon: NotebookPen, href: "/notes", tone: "primary" as const },
    { title: "Attendance", helper: "Class records", icon: ShieldCheck, href: "/attendance", tone: "primary" as const },
    { title: "Assignments", helper: `${assignments.length} total`, icon: FileText, href: "/assignments", tone: "primary" as const },
    { title: "Downloads", helper: "Saved media", icon: Download, href: "/downloads", tone: "primary" as const },
    { title: "Bookmarks", helper: "Saved items", icon: Bookmark, href: "/bookmarks", tone: "primary" as const },
    isTutor
      ? { title: "Instructor", helper: "Monitor learners", icon: UserRound, href: "/tutor", tone: "primary" as const }
      : { title: "Profile", helper: "Your account", icon: UserRound, href: "/profile", tone: "primary" as const },
  ];

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(user?.role) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.assignments(user?.role) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.schedule });
  };

  return (
    <Screen
      onRefresh={refresh}
      refreshing={
        dashboard.isFetching || assignmentsQuery.isFetching || scheduleQuery.isFetching
      }
    >
      <PageHeader
        eyebrow={user?.username || user?.email || undefined}
        title={`Hi, ${user?.name?.split(" ")[0] || "there"}`}
      />

      {/* ── Summary Banner (Gradient) ── */}
      <LinearGradient
        colors={isDark ? ["#4F46E5", "#7C3AED"] : ["#8B5CF6", "#6366F1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.summaryCard, !isDark && shadows.lifted]}
      >
        <View style={styles.summaryLeft}>
          <AppText variant="subtitle" style={{ color: "#FFFFFF" }}>How are you progressing?</AppText>
          <View style={styles.summaryChips}>
            <View style={[styles.glassChip, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <AppText variant="caption" style={{ color: "#FFFFFF", fontWeight: "600" }}>{dashboardCourses.length} courses</AppText>
            </View>
            <View style={[styles.glassChip, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <AppText variant="caption" style={{ color: "#FFFFFF", fontWeight: "600" }}>{submittedAssignments}/{assignments.length} done</AppText>
            </View>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Trophy color="#FBBF24" size={14} />
              <AppText variant="caption" style={{ fontWeight: "600", color: "#FFFFFF" }}>{totalPoints}</AppText>
              <AppText variant="caption" style={{ color: "rgba(255,255,255,0.8)" }}>points</AppText>
            </View>
            <View style={styles.statItem}>
              <Clock3 color="#38BDF8" size={14} />
              <AppText variant="caption" style={{ fontWeight: "600", color: "#FFFFFF" }}>{upcomingEvents.length}</AppText>
              <AppText variant="caption" style={{ color: "rgba(255,255,255,0.8)" }}>upcoming</AppText>
            </View>
          </View>
        </View>
        <ProgressRing 
          value={completionPct} 
          size={76} 
          strokeWidth={8} 
          ringColor="#FFFFFF" 
          trackColor="rgba(255,255,255,0.2)" 
        />
      </LinearGradient>

      {/* ── Quick Actions (Horizontal) ── */}
      <View style={styles.section}>
        <SectionHeader title="Quick actions" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollList}
        >
          {quickActions.map((action) => (
            <ActionTile
              helper={action.helper}
              icon={action.icon}
              key={action.title}
              onPress={() => router.push(action.href)}
              title={action.title}
              tone={action.tone}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Metrics ── */}
      <View style={styles.metricGrid}>
        <MetricCard
          helper="enrolled"
          icon={BookOpen}
          label="Courses"
          value={dashboardCourses.length}
          tone="primary"
        />
        <MetricCard
          helper="submitted"
          icon={CheckCircle2}
          label="Done"
          value={`${submittedAssignments}/${assignments.length}`}
          tone="amber"
        />
      </View>

      {/* ── Continue Learning (Horizontal) ── */}
      <View style={styles.section}>
        <SectionHeader
          action={dashboardCourses.length > 3 ? "See all" : undefined}
          onAction={() => router.push("/(tabs)/learn")}
          title="Continue learning"
        />
        {dashboardCourses.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollList}
          >
            {dashboardCourses.slice(0, 5).map((course, i) => (
              <CourseCard
                course={{
                  _count: {
                    classes: Number(course.classCount ?? course.totalClasses ?? 0),
                    enrolledUsers: Number(course.totalStudents ?? 0),
                  },
                  id: String(course.id || `course-${i}`),
                  isPublished: true,
                  title: String(course.courseTitle || course.title || "Course"),
                }}
                key={String(course.id || `course-${i}`)}
              />
            ))}
          </ScrollView>
        ) : (
          <Card style={styles.emptyRow}>
            <BookOpen color={colors.inkSoft} size={18} />
            <AppText muted>No courses yet</AppText>
          </Card>
        )}
      </View>

      {/* ── Today ── */}
      <View style={styles.section}>
        <SectionHeader 
          title="Today" 
          action={upcomingEvents.length > 2 ? "Schedule" : undefined}
          onAction={() => router.push("/(tabs)/schedule")}
        />
        {upcomingEvents.length ? (
          upcomingEvents.slice(0, 2).map((event, i) => (
            <EventCard event={event} key={`${event.type}-${event.name}-${i}`} />
          ))
        ) : (
          <Card style={styles.emptyRow}>
            <Clock3 color={colors.inkSoft} size={18} />
            <AppText muted>No upcoming events</AppText>
          </Card>
        )}
      </View>

      {/* ── Assignments (Horizontal) ── */}
      <View style={styles.section}>
        <SectionHeader
          action={assignments.length > 3 ? "See all" : undefined}
          onAction={() => router.push("/assignments")}
          title="Assignments"
        />
        {assignments.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollList}
          >
            {assignments.slice(0, 5).map((assignment, i) => (
              <AssignmentCard assignment={assignment} key={assignment.id || `assignment-${i}`} />
            ))}
          </ScrollView>
        ) : (
          <Card style={styles.emptyRow}>
            <FileText color={colors.inkSoft} size={18} />
            <AppText muted>No assignments yet</AppText>
          </Card>
        )}
      </View>

      {/* Add bottom padding so last row isn't hidden behind the floating nav bar */}
      <View style={{ height: 96 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
    justifyContent: "space-between",
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  summaryLeft: {
    flex: 1,
    gap: spacing.md,
  },
  summaryChips: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  glassChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  summaryStats: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  statItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  metricGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  scrollList: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  emptyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
});
