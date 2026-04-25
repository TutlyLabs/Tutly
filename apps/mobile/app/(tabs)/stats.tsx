import { View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowUp } from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { EmptyState } from "~/components/ui/EmptyState";
import { GlassView } from "~/components/ui/GlassView";
import { IconButton } from "~/components/ui/IconButton";
import { Screen } from "~/components/ui/Screen";
import { SectionHeader } from "~/components/ui/SectionHeader";
import { useAssignments, useCourses, useDashboard } from "~/lib/api/hooks";
import {
  selectAssignments,
  selectCourses,
  selectDashboardCourses,
} from "~/lib/api/mobile-selectors";
import { queryKeys } from "~/lib/api/query-keys";
import { useTheme } from "~/lib/theme/use-theme";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function StatsScreen() {
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();
  const dashboardQuery = useDashboard();
  const coursesQuery = useCourses();
  const assignmentsQuery = useAssignments();
  const courses = selectCourses(coursesQuery.data);
  const dashboardCourses = selectDashboardCourses(dashboardQuery.data);
  const assignments = selectAssignments(assignmentsQuery.data);
  const submitted = assignments.filter((item) => item.submissions?.length).length;
  const completion = assignments.length ? Math.round((submitted / assignments.length) * 100) : 0;
  const totalPoints = dashboardCourses.reduce((sum, c) => sum + Number(c.totalPoints ?? 0), 0);

  const todayIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();

  const tints = [colors.tintHtml, colors.tintBackend, colors.tintReact, colors.tintTest] as string[];

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.courses });
    void queryClient.invalidateQueries({ queryKey: queryKeys.assignments() });
  };

  return (
    <Screen
      onRefresh={refresh}
      refreshing={dashboardQuery.isFetching || coursesQuery.isFetching || assignmentsQuery.isFetching}
    >
      {/* Big header */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingVertical: 4 }}>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 30, fontWeight: "700", letterSpacing: -0.9, lineHeight: 34, marginBottom: 6 }}>
            Progress
          </AppText>
          <AppText style={{ fontSize: 12, color: colors.inkSoft }}>Your learning at a glance</AppText>
        </View>
        <IconButton icon={ArrowUp} onPress={() => {}} />
      </View>

      {/* 2x2 BigStat grid */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, gap: 10 }}>
          <BigStatCard label="Completion" value={`${completion}%`} unit="progress" delta={submitted > 0 ? `+${submitted} done` : undefined} tint={colors.primary} colors={colors} />
          <BigStatCard label="Streak" value="3" unit="days 🔥" sub="Keep it going" tint={colors.tintReact} colors={colors} />
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          <BigStatCard label="Courses" value={String(courses.length)} unit="enrolled" sub={`${submitted}/${assignments.length} lessons`} colors={colors} />
          <BigStatCard label="XP earned" value={String(totalPoints)} unit="points" delta={totalPoints > 0 ? `+${totalPoints}` : undefined} tint={colors.tintBackend} colors={colors} />
        </View>
      </View>

      {/* This week chart */}
      <SectionHeader title="This week" />
      <View style={{
        borderRadius: 16,
        padding: 16,
        backgroundColor: colors.canvasDeep,
        borderWidth: 1,
        borderColor: colors.line,
      }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 90, gap: 8 }}>
          {DAYS.map((d, i) => {
            const isToday = i === todayIdx;
            const vals = [0.45, 0.25, 0.70, 0.88, 0.35, 0.15, 0.55];
            const val = i <= todayIdx ? (vals[i] ?? 0.3) : 0.08;
            return (
              <View key={i} style={{ flex: 1, alignItems: "center", gap: 8, height: "100%" }}>
                <View style={{ flex: 1, width: "100%", justifyContent: "flex-end" }}>
                  <View style={{
                    width: "100%",
                    height: `${val * 100}%`,
                    backgroundColor: isToday ? colors.primary : colors.lineHi,
                    borderRadius: 4,
                  }} />
                </View>
                <AppText style={{ fontSize: 10, color: isToday ? colors.ink : colors.inkFaint, fontWeight: isToday ? "600" : "400" }}>
                  {d}
                </AppText>
              </View>
            );
          })}
        </View>
        {/* Summary row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
          <View>
            <AppText style={{ fontSize: 10, color: colors.inkFaint, textTransform: "uppercase", letterSpacing: 0.6 }}>Mins</AppText>
            <AppText style={{ fontSize: 14, fontWeight: "600" }}>214</AppText>
          </View>
          <View>
            <AppText style={{ fontSize: 10, color: colors.inkFaint, textTransform: "uppercase", letterSpacing: 0.6 }}>Lessons</AppText>
            <AppText style={{ fontSize: 14, fontWeight: "600" }}>{submitted}</AppText>
          </View>
          <View>
            <AppText style={{ fontSize: 10, color: colors.inkFaint, textTransform: "uppercase", letterSpacing: 0.6 }}>Avg/day</AppText>
            <AppText style={{ fontSize: 14, fontWeight: "600" }}>31m</AppText>
          </View>
        </View>
      </View>

      {/* Course progress */}
      <SectionHeader title="Course progress" />
      {dashboardCourses.length ? (
        <View style={{ gap: 12 }}>
          {dashboardCourses.map((course, i) => {
            const title = String(course.courseTitle || course.title || "Course");
            const total = Number(course.classCount ?? course.totalClasses ?? 0);
            const done = Number(course.evaluatedAssignments ?? 0);
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const tint = tints[i % tints.length];
            return (
              <GlassView key={String(course.id || i)} style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                padding: 14,
              }}>
                {/* Course icon */}
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: colors.surface2,
                  borderWidth: 1,
                  borderColor: colors.line,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <AppText style={{ fontSize: 14, color: colors.inkMuted, fontWeight: "600", fontFamily: "monospace" }}>
                    {title.charAt(0)}
                  </AppText>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <AppText numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", letterSpacing: -0.1, flex: 1 }}>
                      {title}
                    </AppText>
                    <AppText style={{ fontSize: 11, color: colors.inkSoft, marginLeft: 8 }}>
                      <AppText style={{ color: colors.ink, fontWeight: "600" }}>{done}</AppText> / {total} · <AppText style={{ color: tint, fontWeight: "600" }}>{pct}%</AppText>
                    </AppText>
                  </View>
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.line, overflow: "hidden" }}>
                    <View style={{ width: `${pct}%`, height: "100%", backgroundColor: tint, borderRadius: 3 }} />
                  </View>
                </View>
              </GlassView>
            );
          })}
        </View>
      ) : (
        <EmptyState body="Stats will appear after data loads." icon={Activity} title="No stats yet" />
      )}

      <View style={{ height: 40 }} />
    </Screen>
  );
}

function BigStatCard({ label, value, unit, delta, sub, tint, colors }: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  sub?: string;
  tint?: string;
  colors: any;
}) {
  const glow = tint || colors.primary;
  return (
    <GlassView borderRadius={18} style={{
      position: "relative",
      padding: 14,
      paddingBottom: 16,
      minHeight: 112,
    }}>
      {/* Ambient glow */}
      <View style={{
        position: "absolute",
        top: -40,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: `${glow}20`,
        opacity: 0.6,
      }} pointerEvents="none" />

      <AppText style={{ fontSize: 11, color: colors.inkSoft, fontWeight: "500", marginBottom: 6 }}>{label}</AppText>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5, marginBottom: 4 }}>
        <AppText style={{ fontSize: 28, fontWeight: "700", letterSpacing: -0.84, lineHeight: 32, color: colors.ink }}>
          {value}
        </AppText>
        {unit && <AppText style={{ fontSize: 12, color: colors.inkSoft, fontWeight: "500" }}>{unit}</AppText>}
      </View>
      {delta && <AppText style={{ fontSize: 11, fontWeight: "600", color: colors.success }}>{delta}</AppText>}
      {!delta && sub && <AppText style={{ fontSize: 11, color: colors.inkFaint }}>{sub}</AppText>}
    </GlassView>
  );
}
