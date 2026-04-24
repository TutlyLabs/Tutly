import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { CheckCircle2, Clock3, FileText } from "lucide-react-native";

import type { AssignmentSummary } from "~/types/tutly";
import { AppText } from "~/components/ui/AppText";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { radius, spacing } from "~/lib/theme/tokens";
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
        <Card style={[styles.card, pressed && { opacity: 0.75 }]}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: isDark
                  ? colors.canvas
                  : submitted
                    ? "#EFF6FF"
                    : "#FFFBEB",
              },
            ]}
          >
            <FileText
              color={submitted ? "#2563EB" : "#D97706"}
              size={18}
              strokeWidth={2}
            />
          </View>
          <View style={styles.copy}>
            <AppText variant="subtitle">{assignment.title}</AppText>
            <View style={styles.meta}>
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

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    width: 280, // Fixed width for horizontal scrolling
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 42,
    justifyContent: "center",
    width: 42,
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
