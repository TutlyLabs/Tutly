import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { BookOpen, CalendarDays, ChevronRight } from "lucide-react-native";

import type { CourseSummary } from "~/types/tutly";
import { AppText } from "~/components/ui/AppText";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { radius, spacing } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";

type CourseCardProps = {
  course: CourseSummary;
};

export function CourseCard({ course }: CourseCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <Pressable onPress={() => router.push(`/course/${course.id}`)}>
      {({ pressed }) => (
        <Card style={[styles.card, pressed && { opacity: 0.75 }]}>
          <View style={[styles.iconWrap, { backgroundColor: isDark ? colors.canvas : "#EFF6FF" }]}>
            <BookOpen color="#2563EB" size={20} strokeWidth={2} />
          </View>
          <View style={styles.copy}>
            <AppText variant="subtitle">{course.title}</AppText>
            <View style={styles.meta}>
              <Chip icon={CalendarDays} tone="sky">
                {course._count?.classes ?? 0} classes
              </Chip>
            </View>
          </View>
          <ChevronRight color={colors.inkSoft} size={16} />
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    width: 280,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});
