import type { LucideIcon } from "lucide-react-native";
import type { PressableProps } from "react-native";
import { Pressable, View } from "react-native";

import { shadows } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";
import { AppText } from "./AppText";

type ActionTileTone = "primary" | "green" | "amber" | "coral" | "sky" | "plum";

type ActionTileProps = PressableProps & {
  title: string;
  helper?: string;
  icon: LucideIcon;
  tone?: ActionTileTone;
};

const lightToneColors: Record<ActionTileTone, { bg: string; fg: string }> = {
  primary: { bg: "rgba(91,99,230,0.09)", fg: "#5B63E6" },
  green: { bg: "rgba(16,185,129,0.10)", fg: "#0F9B6E" },
  amber: { bg: "rgba(180,83,9,0.10)", fg: "#B45309" },
  coral: { bg: "rgba(224,82,82,0.10)", fg: "#E05252" },
  sky: { bg: "rgba(14,165,233,0.10)", fg: "#0EA5E9" },
  plum: { bg: "rgba(139,92,246,0.10)", fg: "#8B5CF6" },
};

const darkToneColors: Record<ActionTileTone, { bg: string; fg: string }> = {
  primary: { bg: "rgba(139,147,248,0.12)", fg: "#8B93F8" },
  green: { bg: "rgba(52,211,153,0.14)", fg: "#34D399" },
  amber: { bg: "rgba(245,158,11,0.14)", fg: "#F59E0B" },
  coral: { bg: "rgba(248,113,113,0.14)", fg: "#F87171" },
  sky: { bg: "rgba(56,189,248,0.14)", fg: "#38BDF8" },
  plum: { bg: "rgba(167,139,250,0.14)", fg: "#A78BFA" },
};

export function ActionTile({
  title,
  helper,
  icon: Icon,
  tone = "primary",
  style,
  ...props
}: ActionTileProps) {
  const { colors, isDark } = useTheme();
  
  const tc = isDark ? darkToneColors[tone] : lightToneColors[tone];

  return (
    <Pressable {...props} style={style}>
      {({ pressed }) => (
        <View className="items-center gap-[6px] w-[76px]">
          <View
            className="items-center rounded-pill h-[60px] justify-center w-[60px] border"
            style={[
              { opacity: pressed ? 0.75 : 1, backgroundColor: colors.canvasElevated, borderColor: colors.line },
              !isDark && shadows.card,
            ]}
          >
            <View
              className="items-center rounded-pill h-[44px] justify-center w-[44px]"
              style={{ backgroundColor: tc.bg }}
            >
              <Icon color={tc.fg} size={22} strokeWidth={2.5} />
            </View>
          </View>
          <View className="items-center">
            <AppText variant="caption" numberOfLines={1} adjustsFontSizeToFit style={{ fontWeight: "600", textAlign: "center" }}>
              {title}
            </AppText>
          </View>
        </View>
      )}
    </Pressable>
  );
}
