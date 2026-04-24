import type { LucideIcon } from "lucide-react-native";
import type { PropsWithChildren } from "react";
import type { PressableProps } from "react-native";
import { ActivityIndicator, Pressable, View } from "react-native";

import { useTheme } from "~/lib/theme/use-theme";
import { AppText } from "./AppText";

type ButtonTone = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = PropsWithChildren<
  PressableProps & {
    tone?: ButtonTone;
    icon?: LucideIcon;
    loading?: boolean;
  }
>;

export function Button({
  children,
  style,
  tone = "primary",
  icon: Icon,
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const textColor =
    tone === "primary" ? "#FFFFFF"
      : tone === "danger" ? "#FFFFFF"
      : tone === "secondary" ? colors.primaryDark
      : colors.ink;
  const backgroundColor =
    tone === "primary"
      ? colors.primary
      : tone === "danger"
        ? colors.danger
        : tone === "secondary"
          ? colors.primaryLight
          : "transparent";
  const borderColor =
    tone === "ghost" ? colors.border : tone === "secondary" ? colors.primaryLight : backgroundColor;

  return (
    <Pressable {...props} disabled={isDisabled} style={style}>
      {({ pressed }) => (
        <View
          style={{
            alignItems: "center",
            borderRadius: 12,
            borderStyle: "solid",
            borderWidth: 1,
            justifyContent: "center",
            minHeight: 42,
            paddingHorizontal: 24,
            backgroundColor,
            borderColor,
            opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color={textColor} size="small" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {Icon ? <Icon color={textColor} size={16} strokeWidth={2.2} /> : null}
              <AppText variant="caption" style={{ color: textColor, fontWeight: "600" }}>
                {children}
              </AppText>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}
