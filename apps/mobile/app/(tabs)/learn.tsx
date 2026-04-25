import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { BookOpenCheck, Search } from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { EmptyState } from "~/components/ui/EmptyState";
import { GlassView } from "~/components/ui/GlassView";
import { IconButton } from "~/components/ui/IconButton";
import { Screen } from "~/components/ui/Screen";
import { useCourses } from "~/lib/api/hooks";
import { selectCourses } from "~/lib/api/mobile-selectors";
import { queryKeys } from "~/lib/api/query-keys";
import { useTheme } from "~/lib/theme/use-theme";

type FilterKey = "all" | "in_progress" | "completed" | "not_started";

const COURSE_TINTS_DARK = ["#B197FC", "#34D399", "#6EA8FE", "#FBBF77"];
const COURSE_TINTS_LIGHT = ["#7A4EE3", "#0F9B6E", "#2E6BEA", "#C06A2E"];
const COURSE_ICONS: Record<string, string> = {
  react: "⚛",
  backend: "⬡",
  html: "</>",
  default: "◆",
};

export default function LearnScreen() {
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();
  const coursesQuery = useCourses();
  const courses = selectCourses(coursesQuery.data);
  const [filter, setFilter] = useState<FilterKey>("all");

  const filteredCourses = courses.filter((c) => {
    if (filter === "all") return true;
    const classCount = c._count?.classes ?? 0;
    if (filter === "not_started") return classCount === 0;
    if (filter === "completed") return false; // placeholder
    return classCount > 0; // in_progress
  });

  const totalLessons = courses.reduce((sum, c) => sum + (c._count?.classes ?? 0), 0);

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: courses.length },
    { key: "in_progress", label: "In progress", count: courses.filter((c) => (c._count?.classes ?? 0) > 0).length },
    { key: "completed", label: "Completed", count: 0 },
    { key: "not_started", label: "Not started", count: courses.filter((c) => (c._count?.classes ?? 0) === 0).length },
  ];

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.courses });
  };

  return (
    <Screen onRefresh={refresh} refreshing={coursesQuery.isFetching}>
      {/* Big header */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingVertical: 4 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText style={{ fontSize: 30, fontWeight: "700", letterSpacing: -0.9, lineHeight: 34, marginBottom: 6 }}>
            Courses
          </AppText>
          <AppText style={{ fontSize: 12, color: colors.inkSoft }}>
            {courses.length} enrolled · {totalLessons} lessons
          </AppText>
        </View>
        <IconButton icon={Search} onPress={() => {}} />
      </View>

      {/* Chip filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 20 }}
        style={{ marginHorizontal: -20, paddingLeft: 20, marginBottom: 4 }}
      >
        {filters.map((f) => {
          const active = f.key === filter;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)}>
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? colors.lineHi : colors.line,
                  backgroundColor: active ? colors.surface2 : "transparent",
                }}
              >
                <AppText style={{ fontSize: 12, fontWeight: "600", letterSpacing: -0.1, color: active ? colors.ink : colors.inkSoft }}>
                  {f.label}
                  {f.count > 0 && (
                    <AppText style={{ color: colors.inkFaint, fontWeight: "500" }}> · {f.count}</AppText>
                  )}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Course banner cards */}
      <View style={{ gap: 14 }}>
        {filteredCourses.map((course, i) => {
          const tint = (isDark ? COURSE_TINTS_DARK[i % 4] : COURSE_TINTS_LIGHT[i % 4])!;
          const classCount = course._count?.classes ?? 0;
          const pct = 0; // placeholder — real progress would come from API
          const level = classCount > 20 ? "Beginner" : classCount > 10 ? "Intermediate" : "Beginner";

          return (
            <Pressable key={course.id} onPress={() => router.push(`/course/${course.id}`)}>
              {({ pressed }) => (
                <GlassView borderRadius={20} style={{ opacity: pressed ? 0.85 : 1 }}>
                  {/* Gradient banner */}
                  <View style={{ position: "relative", height: 130, overflow: "hidden" }}>
                    <LinearGradient
                      colors={[tint, `${tint}AA`, `${tint}55`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                    {/* Dark overlay */}
                    <LinearGradient
                      colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.45)"]}
                      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                    {/* Light shimmer */}
                    <LinearGradient
                      colors={["rgba(255,255,255,0.08)", "transparent"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 0.45 }}
                      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                    {/* Level tag */}
                    <View style={{
                      position: "absolute", top: 14, left: 14,
                      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                      backgroundColor: "rgba(0,0,0,0.28)",
                      borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
                    }}>
                      <AppText style={{ fontSize: 10, fontWeight: "700", color: "#FFFFFF", letterSpacing: 1, textTransform: "uppercase" }}>
                        {level}
                      </AppText>
                    </View>
                    {/* Lesson count */}
                    <View style={{
                      position: "absolute", top: 14, right: 14,
                      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
                      backgroundColor: "rgba(0,0,0,0.28)",
                      borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
                    }}>
                      <AppText style={{ fontSize: 11, fontWeight: "600", color: "#FFFFFF" }}>
                        {classCount} lessons
                      </AppText>
                    </View>
                    {/* Course icon */}
                    <View style={{ position: "absolute", right: 18, bottom: -10, opacity: 0.55 }}>
                      <View style={{
                        width: 100, height: 100, borderRadius: 24,
                        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)",
                        borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.1)",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <AppText style={{ fontSize: 28, color: colors.inkMuted, fontWeight: "600", fontFamily: "monospace" }}>
                          {COURSE_ICONS[course.title?.toLowerCase().includes("react") ? "react" : course.title?.toLowerCase().includes("html") ? "html" : "default"]}
                        </AppText>
                      </View>
                    </View>
                  </View>

                  {/* Card body */}
                  <View style={{ padding: 16, paddingTop: 14 }}>
                    <AppText style={{ fontSize: 18, fontWeight: "700", letterSpacing: -0.3, marginBottom: 3 }}>
                      {course.title}
                    </AppText>
                    <AppText style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 12 }}>
                      {classCount} classes · {course._count?.enrolledUsers ?? 0} students
                    </AppText>
                    {/* Progress bar */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: "hidden" }}>
                        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: tint, borderRadius: 2 }} />
                      </View>
                      <AppText style={{ fontSize: 11, fontWeight: "600", color: colors.ink, minWidth: 48, textAlign: "right" }}>
                        0/{classCount}
                      </AppText>
                    </View>
                  </View>
                </GlassView>
              )}
            </Pressable>
          );
        })}
      </View>

      {!courses.length && !coursesQuery.isLoading ? (
        <EmptyState
          body="Your enrolled courses will appear here."
          icon={BookOpenCheck}
          title="No courses yet"
        />
      ) : null}

      <View style={{ height: 40 }} />
    </Screen>
  );
}
