import { Platform } from "react-native";

export const colors = {
  canvas: "#F4F6F8",
  canvasElevated: "#FFFFFF",
  ink: "#09090B",
  inkMuted: "#52525B",
  inkSoft: "#A1A1AA",
  border: "#E4E4E7",
  line: "#E4E4E7",
  primary: "#6366F1",
  primaryDark: "#4F46E5",
  primaryLight: "#EEF2FF",
  primarySubtle: "#E0E7FF",
  amber: "#F59E0B",
  amberLight: "#FEF3C7",
  coral: "#EF4444",
  coralLight: "#FEE2E2",
  sky: "#0EA5E9",
  skyLight: "#E0F2FE",
  plum: "#8B5CF6",
  plumLight: "#EDE9FE",
  green: "#10B981",
  greenLight: "#D1FAE5",
  white: "#FFFFFF",
  danger: "#EF4444",
  success: "#10B981",
  successLight: "#D1FAE5",
  warning: "#F59E0B",
  overlay: "rgba(9, 9, 11, 0.4)",
} as const;

export const darkColors = {
  canvas: "#000000",
  canvasElevated: "#18181B",
  ink: "#FFFFFF",
  inkMuted: "#A1A1AA",
  inkSoft: "#71717A",
  border: "#27272A",
  line: "#27272A",
  primary: "#818CF8",
  primaryDark: "#6366F1",
  primaryLight: "#312E81",
  primarySubtle: "#1E1B4B",
  amber: "#FBBF24",
  amberLight: "#78350F",
  coral: "#F87171",
  coralLight: "#7F1D1D",
  sky: "#38BDF8",
  skyLight: "#0C4A6E",
  plum: "#A78BFA",
  plumLight: "#4C1D95",
  green: "#34D399",
  greenLight: "#064E3B",
  white: "#FFFFFF",
  danger: "#F87171",
  success: "#34D399",
  successLight: "#064E3B",
  warning: "#FBBF24",
  overlay: "rgba(0, 0, 0, 0.7)",
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 6,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: "#000000",
      shadowOpacity: 0.05,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  lifted: Platform.select({
    ios: {
      shadowColor: "#000000",
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 24,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
} as const;

export const font = {
  display: Platform.select({
    ios: "System",
    android: "sans-serif-medium",
    default: "system-ui",
  }),
  body: Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "system-ui",
  }),
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }),
};

export type AppColorName = keyof typeof colors;
