import type { LucideIcon } from "lucide-react-native";
import type { PropsWithChildren } from "react";
import type { ViewProps } from "react-native";
import { View } from "react-native";

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
  className,
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
      className={`flex-row items-center self-start rounded-sm gap-[4px] px-sm py-[3px] ${className || ""}`}
      style={[{ backgroundColor: bg }, style]}
    >
      {Icon ? <Icon color={fg} size={12} strokeWidth={2.4} /> : null}
      <AppText variant="caption" style={{ color: fg, fontWeight: "600" }}>
        {children}
      </AppText>
    </View>
  );
}
