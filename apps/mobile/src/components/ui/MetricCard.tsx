import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { radius, shadows, spacing } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";
import { AppText } from "./AppText";

type MetricCardProps = {
  label: string;
  value: string | number;
  helper?: string;
  icon: LucideIcon;
  tone?: "primary" | "green" | "amber" | "coral" | "sky" | "plum";
};

const lightConfig = {
  primary: { bg: "#EEF2FF", fg: "#4F46E5", border: "#C7D2FE" },
  green: { bg: "#D1FAE5", fg: "#10B981", border: "#A7F3D0" },
  amber: { bg: "#FEF3C7", fg: "#F59E0B", border: "#FDE68A" },
  coral: { bg: "#FEE2E2", fg: "#EF4444", border: "#FECACA" },
  sky: { bg: "#E0F2FE", fg: "#0EA5E9", border: "#BAE6FD" },
  plum: { bg: "#EDE9FE", fg: "#8B5CF6", border: "#DDD6FE" },
} as const;

const darkConfig = {
  primary: { bg: "#312E81", fg: "#818CF8", border: "#4F46E5" },
  green: { bg: "#064E3B", fg: "#34D399", border: "#10B981" },
  amber: { bg: "#78350F", fg: "#FBBF24", border: "#F59E0B" },
  coral: { bg: "#7F1D1D", fg: "#F87171", border: "#EF4444" },
  sky: { bg: "#0C4A6E", fg: "#38BDF8", border: "#0EA5E9" },
  plum: { bg: "#4C1D95", fg: "#A78BFA", border: "#8B5CF6" },
} as const;

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "primary",
}: MetricCardProps) {
  const { colors, isDark } = useTheme();
  
  const tc = isDark ? darkConfig[tone] : lightConfig[tone];

  return (
    <View
      style={[
        styles.card,
        !isDark && shadows.card,
        {
          backgroundColor: colors.canvasElevated,
          borderColor: isDark ? colors.border : colors.line,
          borderWidth: 1,
        },
      ]}
    >
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: tc.bg }]}>
          <Icon color={tc.fg} size={18} strokeWidth={2.2} />
        </View>
        <AppText muted variant="caption">
          {label}
        </AppText>
      </View>
      <AppText variant="title" style={{ color: isDark ? colors.ink : tc.fg }}>
        {value}
      </AppText>
      {helper ? (
        <AppText muted variant="caption">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    flex: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  top: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: radius.sm,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
});
