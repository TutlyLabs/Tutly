import type { LucideIcon } from "lucide-react-native";
import type { PropsWithChildren } from "react";
import type { PressableProps } from "react-native";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { radius, spacing } from "~/lib/theme/tokens";
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
    <Pressable
      {...props}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor,
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style as object,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.content}>
          {Icon ? <Icon color={textColor} size={16} strokeWidth={2.2} /> : null}
          <AppText variant="caption" style={{ color: textColor, fontWeight: "600" }}>
            {children}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.lg,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
});
