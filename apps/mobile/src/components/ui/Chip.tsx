import type { LucideIcon } from "lucide-react-native";
import type { PropsWithChildren } from "react";
import type { ViewProps } from "react-native";
import { StyleSheet, View } from "react-native";

import { radius, spacing } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";
import { AppText } from "./AppText";

type ChipProps = PropsWithChildren<
  ViewProps & {
    icon?: LucideIcon;
    tone?: "neutral" | "primary" | "amber" | "coral" | "sky" | "plum" | "green";
  }
>;

export function Chip({
  children,
  style,
  icon: Icon,
  tone = "neutral",
  ...props
}: ChipProps) {
  const { colors } = useTheme();
  const bg =
    tone === "primary" || tone === "green"
      ? colors.primaryLight
      : tone === "amber"
        ? colors.amberLight
        : tone === "coral"
          ? colors.coralLight
          : tone === "sky"
            ? colors.skyLight
            : tone === "plum"
              ? colors.plumLight
              : colors.canvas;
  const fg =
    tone === "primary" || tone === "green"
      ? colors.primaryDark
      : tone === "amber"
        ? colors.warning
        : tone === "coral"
          ? colors.danger
          : tone === "sky"
            ? "#0369A1"
            : tone === "plum"
              ? "#6D28D9"
              : colors.inkMuted;

  return (
    <View
      {...props}
      style={[
        styles.base,
        { backgroundColor: bg },
        style,
      ]}
    >
      {Icon ? <Icon color={fg} size={12} strokeWidth={2.4} /> : null}
      <AppText variant="caption" style={{ color: fg, fontWeight: "600" }}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
});
