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
  primary: { bg: "#EEF2FF", fg: "#4F46E5" },
  green: { bg: "#D1FAE5", fg: "#10B981" },
  amber: { bg: "#FEF3C7", fg: "#F59E0B" },
  coral: { bg: "#FEE2E2", fg: "#EF4444" },
  sky: { bg: "#E0F2FE", fg: "#0EA5E9" },
  plum: { bg: "#EDE9FE", fg: "#8B5CF6" },
};

const darkToneColors: Record<ActionTileTone, { bg: string; fg: string }> = {
  primary: { bg: "#312E81", fg: "#818CF8" },
  green: { bg: "#064E3B", fg: "#34D399" },
  amber: { bg: "#78350F", fg: "#FBBF24" },
  coral: { bg: "#7F1D1D", fg: "#F87171" },
  sky: { bg: "#0C4A6E", fg: "#38BDF8" },
  plum: { bg: "#4C1D95", fg: "#A78BFA" },
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
