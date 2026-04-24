import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "~/lib/theme/use-theme";
import { AppText } from "./AppText";

type ProgressRingProps = {
  value: number;
  size?: number;
  label?: string;
  strokeWidth?: number;
  ringColor?: string;
  trackColor?: string;
};

export function ProgressRing({ value, size = 64, label, strokeWidth = 6, ringColor, trackColor }: ProgressRingProps) {
  const { colors } = useTheme();
  const normalizedValue = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const dashOffset = circumference - (normalizedValue / 100) * circumference;

  return (
    <View style={{ height: size, width: size }}>
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke={trackColor || colors.border}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke={ringColor || colors.primary}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View
        style={{
          alignItems: "center",
          bottom: 0,
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0,
          top: 0,
        }}
      >
        <AppText variant="caption" style={{ fontWeight: "700", color: ringColor || undefined }}>{Math.round(normalizedValue)}%</AppText>
        {label ? (
          <AppText muted variant="caption" style={{ fontSize: 10, color: ringColor ? "rgba(255,255,255,0.7)" : undefined }}>
            {label}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
