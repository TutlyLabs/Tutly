import type { PropsWithChildren } from "react";
import type { ViewProps } from "react-native";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

import { useTheme } from "~/lib/theme/use-theme";

type GlassViewProps = PropsWithChildren<
  ViewProps & {
    intensity?: number;
    borderRadius?: number;
  }
>;

/**
 * Glassmorphic container.
 * Dark mode: semi-transparent surface (rgba(255,255,255,0.035)) + BlurView backdrop + top highlight.
 * Light mode: plain opaque white surface, no blur needed.
 */
export function GlassView({
  children,
  style,
  intensity = 20,
  borderRadius = 14,
  ...props
}: GlassViewProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: isDark ? colors.canvasElevated : colors.canvasElevated,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius,
          overflow: "hidden",
        },
        // Subtle top inner highlight in dark mode (simulates inset shadow)
        isDark && {
          borderTopColor: "rgba(255,255,255,0.06)",
        },
        style,
      ]}
    >
      {isDark && (
        <BlurView
          intensity={intensity}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  );
}
