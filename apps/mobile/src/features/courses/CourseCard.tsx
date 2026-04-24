import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { BookOpen, CalendarDays, ChevronRight } from "lucide-react-native";

import type { CourseSummary } from "~/types/tutly";
import { AppText } from "~/components/ui/AppText";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { useTheme } from "~/lib/theme/use-theme";

type CourseCardProps = {
  course: CourseSummary;
};

export function CourseCard({ course }: CourseCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <Pressable onPress={() => router.push(`/course/${course.id}`)}>
      {({ pressed }) => (
        <Card className="flex-row items-center gap-md w-[280px]" style={pressed ? { opacity: 0.75 } : undefined}>
          <View
            className="items-center rounded-md h-[44px] justify-center w-[44px]"
            style={{ backgroundColor: isDark ? colors.canvas : "#EFF6FF" }}
          >
            <BookOpen color="#2563EB" size={20} strokeWidth={2} />
          </View>
          <View className="flex-1 gap-xs">
            <AppText variant="subtitle">{course.title}</AppText>
            <View className="flex-row flex-wrap gap-xs">
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
