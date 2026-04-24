import type { PropsWithChildren } from "react";
import type { TextProps } from "react-native";
import { StyleSheet, Text } from "react-native";

import { font } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";

type Variant =
  | "hero"
  | "title"
  | "subtitle"
  | "body"
  | "caption"
  | "label"
  | "mono";

type AppTextProps = PropsWithChildren<
  TextProps & {
    variant?: Variant;
    muted?: boolean;
  }
>;

export function AppText({
  children,
  style,
  variant = "body",
  muted = false,
  ...props
}: AppTextProps) {
  const { colors } = useTheme();

  return (
    <Text
      {...props}
      style={[
        styles.base,
        styles[variant],
        { color: muted ? colors.inkMuted : colors.ink },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: font.body,
    letterSpacing: 0,
  },
  hero: {
    fontFamily: font.display,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
  },
  title: {
    fontFamily: font.display,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  body: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mono: {
    fontFamily: font.mono,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
});
