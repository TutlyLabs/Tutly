import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { CheckCircle2, Clock3, FileText } from "lucide-react-native";

import type { AssignmentSummary } from "~/types/tutly";
import { AppText } from "~/components/ui/AppText";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { useTheme } from "~/lib/theme/use-theme";

type AssignmentCardProps = {
  assignment: AssignmentSummary;
};

export function AssignmentCard({ assignment }: AssignmentCardProps) {
  const { colors, isDark } = useTheme();
  const submitted = Boolean(assignment.submissions?.length);
  const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;

  return (
    <Pressable onPress={() => router.push(`/assignment/${assignment.id}`)}>
      {({ pressed }) => (
        <Card className="flex-row items-center gap-md w-[280px]" style={pressed ? { opacity: 0.75 } : undefined}>
          <View
            className="items-center rounded-md h-[42px] justify-center w-[42px]"
            style={{
              backgroundColor: isDark
                ? colors.canvas
                : submitted
                  ? "#EFF6FF"
                  : "#FFFBEB",
            }}
          >
            <FileText
              color={submitted ? "#2563EB" : "#D97706"}
              size={18}
              strokeWidth={2}
            />
          </View>
          <View className="flex-1 gap-xs">
            <AppText variant="subtitle">{assignment.title}</AppText>
            <View className="flex-row flex-wrap gap-xs">
              <Chip
                icon={submitted ? CheckCircle2 : Clock3}
                tone={submitted ? "primary" : "amber"}
              >
                {submitted ? "Submitted" : "Pending"}
              </Chip>
              {dueDate ? (
                <Chip icon={Clock3} tone="coral">
                  {dueDate.toLocaleDateString()}
                </Chip>
              ) : null}
            </View>
          </View>
        </Card>
      )}
    </Pressable>
  );
}
