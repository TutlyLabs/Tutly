import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";

import { shadows } from "~/lib/theme/tokens";
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
  primary: { bg: "rgba(91,99,230,0.09)", fg: "#5B63E6" },
  green: { bg: "rgba(16,185,129,0.10)", fg: "#0F9B6E" },
  amber: { bg: "rgba(180,83,9,0.10)", fg: "#B45309" },
  coral: { bg: "rgba(224,82,82,0.10)", fg: "#E05252" },
  sky: { bg: "rgba(14,165,233,0.10)", fg: "#0EA5E9" },
  plum: { bg: "rgba(139,92,246,0.10)", fg: "#8B5CF6" },
} as const;

const darkConfig = {
  primary: { bg: "rgba(139,147,248,0.12)", fg: "#8B93F8" },
  green: { bg: "rgba(52,211,153,0.14)", fg: "#34D399" },
  amber: { bg: "rgba(245,158,11,0.14)", fg: "#F59E0B" },
  coral: { bg: "rgba(248,113,113,0.14)", fg: "#F87171" },
  sky: { bg: "rgba(56,189,248,0.14)", fg: "#38BDF8" },
  plum: { bg: "rgba(167,139,250,0.14)", fg: "#A78BFA" },
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
      className="rounded-lg flex-1 gap-sm p-md border"
      style={[!isDark ? shadows.card : undefined, { backgroundColor: colors.canvasElevated, borderColor: colors.line }]}
    >
      <View className="flex-row items-center gap-sm">
        <View
          className="items-center rounded-sm h-[28px] justify-center w-[28px]"
          style={{ backgroundColor: tc.bg }}
        >
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
