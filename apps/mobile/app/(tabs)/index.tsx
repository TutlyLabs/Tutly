import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Clock3,
  FileText,
  Flame,
  Play,
} from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";

import { AppText } from "~/components/ui/AppText";
import { GlassView } from "~/components/ui/GlassView";
import { IconButton } from "~/components/ui/IconButton";
import { Screen } from "~/components/ui/Screen";
import { SectionHeader } from "~/components/ui/SectionHeader";
import { EventCard } from "~/features/schedule/EventCard";
import { useAssignments, useDashboard, useSchedule } from "~/lib/api/hooks";
import {
  selectAssignments,
  selectDashboardCourses,
  selectScheduleEvents,
} from "~/lib/api/mobile-selectors";
import { queryKeys } from "~/lib/api/query-keys";
import { useAuth } from "~/lib/auth/auth-provider";
import { useTheme } from "~/lib/theme/use-theme";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

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
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [events]);

  const submittedAssignments = assignments.filter((a) => a.submissions?.length).length;
  const totalLessons = dashboardCourses.reduce(
    (sum, c) => sum + Number(c.classCount ?? c.totalClasses ?? 0), 0,
  );
  const completedLessons = dashboardCourses.reduce(
    (sum, c) => sum + Number(c.evaluatedAssignments ?? c.totalPoints ?? 0), 0,
  );
  const completionPct = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const safeCompletionPct = Math.min(completionPct, 100);

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const todayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0

  const pendingAssignments = assignments.filter((a) => !a.submissions?.length);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(user?.role) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.assignments(user?.role) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.schedule });
  };

  // Progress ring measurements
  const ringSize = 76;
  const ringStroke = 5;
  const ringRadius = 32;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset = ringCircumference - (ringCircumference * safeCompletionPct) / 100;

  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return (
    <Screen
      onRefresh={refresh}
      refreshing={dashboard.isFetching || assignmentsQuery.isFetching || scheduleQuery.isFetching}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
        <View>
          <AppText style={{ fontSize: 11, color: colors.inkSoft, fontWeight: "500", marginBottom: 4 }}>
            {dateStr}
          </AppText>
          <AppText style={{ fontSize: 24, fontWeight: "700", letterSpacing: -0.7, lineHeight: 28 }}>
            Hi, {user?.name?.split(" ")[0] || "there"} 👋
          </AppText>
        </View>
        <IconButton icon={Bell} onPress={() => router.push("/notifications")} />
      </View>

      {/* Hero Card — glassmorphic */}
      <GlassView
        borderRadius={22}
        intensity={isDark ? 40 : 0}
        style={{
          ...(isDark ? {} : { shadowColor: "#0A0A12", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }),
        }}
      >
        {/* Subtle inner gradient for depth */}
        <LinearGradient
          colors={isDark
            ? ["rgba(255,255,255,0.04)", "rgba(255,255,255,0.01)"]
            : ["#FFFFFF", "#F5F5F8"]
          }
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Faint accent glow behind ring — clipped circle */}
        <View
          style={{
            position: "absolute",
            right: -40,
            top: -40,
            width: 200,
            height: 200,
            borderRadius: 100,
            overflow: "hidden",
          }}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[
              isDark ? `${colors.primary}30` : `${colors.primary}18`,
              "transparent",
            ]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>

        {/* Top section: Ring + text */}
        <View style={{ padding: 18, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 16 }}>
          {/* Progress Ring */}
          <View style={{ position: "relative", width: ringSize, height: ringSize }}>
            <Svg width={ringSize} height={ringSize}>
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(10,10,18,0.08)"}
                strokeWidth={ringStroke}
                fill="none"
              />
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                stroke={colors.primary}
                strokeWidth={ringStroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                strokeDashoffset={ringDashOffset}
                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              />
            </Svg>
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
              <AppText style={{ fontSize: 18, fontWeight: "700", letterSpacing: -0.5, color: colors.ink }}>
                {safeCompletionPct}
                <AppText style={{ fontSize: 11, opacity: 0.6 }}>%</AppText>
              </AppText>
              <AppText style={{ fontSize: 8, color: colors.inkFaint, textTransform: "uppercase", letterSpacing: 1, fontWeight: "700", marginTop: 3 }}>
                done
              </AppText>
            </View>
          </View>

          {/* Headline + sub */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText style={{ fontSize: 16, fontWeight: "700", letterSpacing: -0.3, lineHeight: 20 }}>
              You're on track this week
            </AppText>
            <AppText style={{ fontSize: 12, color: colors.inkSoft, marginTop: 4, lineHeight: 17 }}>
              {completedLessons} of {totalLessons} lessons · {dashboardCourses.length} courses
            </AppText>
            {/* Streak line */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
              <Flame color={colors.amber} size={14} strokeWidth={1.7} />
              <AppText style={{ fontSize: 11, fontWeight: "600", color: colors.ink }}>
                Learning streak
              </AppText>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colors.line }} />

        {/* Weekly bars */}
        <View style={{ padding: 14, paddingHorizontal: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8, height: 42 }}>
            {DAYS.map((d, i) => {
              const isToday = i === todayIdx;
              const hasPast = i <= todayIdx;
              const barHeights = [55, 80, 30, 95, 40, 20, 60];
              const barHeight = hasPast ? Math.max(14, barHeights[i] ?? 50) : 14;
              return (
                <View key={i} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <View style={{ width: "100%", height: 28, justifyContent: "flex-end" }}>
                    <View
                      style={{
                        width: "100%",
                        height: `${barHeight}%`,
                        borderRadius: 4,
                        backgroundColor: hasPast
                          ? isToday
                            ? colors.primary
                            : isDark
                              ? "rgba(139,147,248,0.55)"
                              : "rgba(91,99,230,0.45)"
                          : isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(10,10,18,0.06)",
                      }}
                    />
                  </View>
                  <AppText style={{ fontSize: 10, fontWeight: isToday ? "600" : "400", color: isToday ? colors.ink : colors.inkFaint, letterSpacing: 0.2 }}>
                    {d}
                  </AppText>
                </View>
              );
            })}
          </View>
        </View>
      </GlassView>

      {/* Continue Learning */}
      <SectionHeader
        title="Continue learning"
        action={dashboardCourses.length > 3 ? "See all" : undefined}
        onAction={() => router.push("/(tabs)/learn")}
      />
      {dashboardCourses.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingRight: 20 }}
          style={{ marginHorizontal: -20, paddingLeft: 20 }}
        >
          {dashboardCourses.slice(0, 5).map((course, i) => {
            const courseTitle = String(course.courseTitle || course.title || "Course");
            const classCount = Number(course.classCount ?? course.totalClasses ?? 0);
            const tints = [colors.tintReact, colors.tintBackend, colors.tintHtml, colors.tintTest] as string[];
            const tint = tints[i % tints.length]!;
            const pct = classCount > 0 ? Math.round((Number(course.evaluatedAssignments ?? 0) / classCount) * 100) : 0;
            return (
              <Pressable
                key={String(course.id || `course-${i}`)}
                onPress={() => router.push(`/course/${course.id}`)}
              >
                <GlassView borderRadius={18} style={{ width: 240 }}>
                  {/* Gradient banner */}
                  <View style={{ position: "relative", height: 110, overflow: "hidden" }}>
                    <LinearGradient
                      colors={[tint, `${tint}88`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                    <LinearGradient
                      colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.5)"]}
                      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                    {/* Resume pill */}
                    <View style={{
                      position: "absolute", top: 12, left: 12,
                      flexDirection: "row", alignItems: "center", gap: 5,
                      backgroundColor: "rgba(0,0,0,0.32)",
                      borderWidth: 1, borderColor: "rgba(255,255,255,0.24)",
                      paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
                    }}>
                      <Play color="#FFFFFF" size={10} fill="#FFFFFF" />
                      <AppText style={{ fontSize: 10, fontWeight: "700", color: "#FFFFFF" }}>Resume</AppText>
                    </View>
                  </View>
                  {/* Card body */}
                  <View style={{ padding: 14, paddingTop: 12 }}>
                    <AppText numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", letterSpacing: -0.1, marginBottom: 2 }}>
                      {courseTitle}
                    </AppText>
                    <AppText numberOfLines={1} style={{ fontSize: 11, color: colors.inkSoft, marginBottom: 10 }}>
                      {classCount} lessons
                    </AppText>
                    <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.line, overflow: "hidden", marginBottom: 7 }}>
                      <View style={{ width: `${Math.min(pct, 100)}%`, height: "100%", backgroundColor: tint, borderRadius: 2 }} />
                    </View>
                    <AppText style={{ fontSize: 10, color: colors.inkFaint }}>{pct}% complete</AppText>
                  </View>
                </GlassView>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <GlassView style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16 }}>
          <BookOpen color={colors.inkSoft} size={18} strokeWidth={1.7} />
          <AppText style={{ color: colors.inkSoft }}>No courses yet</AppText>
        </GlassView>
      )}

      {/* Today */}
      <SectionHeader
        title="Today"
        action={upcomingEvents.length > 2 ? "Schedule" : undefined}
        onAction={() => router.push("/(tabs)/schedule")}
      />
      {upcomingEvents.length ? (
        <View style={{ gap: 10 }}>
          {upcomingEvents.slice(0, 2).map((event, i) => (
            <EventCard event={event} key={`${event.type}-${event.name}-${i}`} />
          ))}
        </View>
      ) : (
        <GlassView style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16 }}>
          <Clock3 color={colors.inkSoft} size={18} strokeWidth={1.7} />
          <AppText style={{ color: colors.inkSoft }}>No upcoming events</AppText>
        </GlassView>
      )}

      {/* Assignments */}
      <SectionHeader
        title="Assignments"
        action={assignments.length > 3 ? "See all" : undefined}
        onAction={() => router.push("/assignments")}
      />
      {pendingAssignments.length ? (
        <View style={{ gap: 10 }}>
          {pendingAssignments.slice(0, 3).map((assignment) => (
            <Pressable
              key={assignment.id}
              onPress={() => router.push(`/assignment/${assignment.id}`)}
            >
              <GlassView style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
                  <FileText color={colors.inkMuted} size={18} strokeWidth={1.7} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", letterSpacing: -0.1, marginBottom: 2 }}>
                    {assignment.title}
                  </AppText>
                  <AppText numberOfLines={1} style={{ fontSize: 11, color: colors.inkSoft }}>
                    {assignment.dueDate
                      ? `Due ${new Date(assignment.dueDate).toLocaleDateString()}`
                      : "No due date"}
                  </AppText>
                </View>
                {assignment.dueDate && new Date(assignment.dueDate).getTime() - Date.now() < 86400000 * 2 ? (
                  <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.amberLight }}>
                    <AppText style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", color: colors.amber }}>
                      Due soon
                    </AppText>
                  </View>
                ) : (
                  <ChevronRight color={colors.inkFaint} size={14} />
                )}
              </GlassView>
            </Pressable>
          ))}
        </View>
      ) : (
        <GlassView style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16 }}>
          <FileText color={colors.inkSoft} size={18} strokeWidth={1.7} />
          <AppText style={{ color: colors.inkSoft }}>No pending assignments</AppText>
        </GlassView>
      )}

      <View style={{ height: 40 }} />
    </Screen>
  );
}
