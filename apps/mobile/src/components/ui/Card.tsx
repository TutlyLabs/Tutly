import type { PropsWithChildren } from "react";
import type { ViewProps } from "react-native";
import { StyleSheet, View } from "react-native";

import { radius, shadows, spacing } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";

type CardProps = PropsWithChildren<
  ViewProps & {
    padded?: boolean;
    elevated?: boolean;
  }
>;

export function Card({
  children,
  style,
  padded = true,
  elevated = false,
  ...props
}: CardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      {...props}
      style={[
        styles.base,
        {
          backgroundColor: colors.canvasElevated,
          borderColor: isDark ? colors.border : colors.line,
          borderWidth: 1,
        },
        padded && styles.padded,
        elevated && (isDark ? {} : shadows.lifted),
        !elevated && !isDark && shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  padded: {
    padding: spacing.lg,
  },
});
