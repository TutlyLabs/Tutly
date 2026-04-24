import type { PropsWithChildren } from "react";
import type { ViewProps } from "react-native";
import { View } from "react-native";

import { shadows } from "~/lib/theme/tokens";
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
  className,
  padded = true,
  elevated = false,
  ...props
}: CardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      {...props}
      className={`rounded-lg overflow-hidden ${padded ? "p-lg" : ""} ${className || ""}`}
      style={[
        {
          backgroundColor: colors.canvasElevated,
          borderWidth: 1,
          borderColor: colors.line,
        },
        elevated && (isDark ? {} : shadows.lifted),
        !elevated && !isDark && shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
