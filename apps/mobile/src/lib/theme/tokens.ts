import { Platform } from "react-native";

// Light theme — Unacademy-inspired warm slate-navy text, off-white surfaces
export const colors = {
  canvas: "#F5F5F7",
  canvasElevated: "#FFFFFF",
  canvasDeep: "#ECECF0",
  surface2: "#F0F0F4",
  ink: "#1F2433",
  inkMuted: "#51525C",
  inkSoft: "#7E8088",
  inkFaint: "#ADB0B8",
  border: "rgba(48,54,66,0.09)",
  line: "rgba(48,54,66,0.09)",
  lineHi: "rgba(48,54,66,0.14)",
  primary: "#5B63E6",
  primaryDark: "#4A52D4",
  primaryLight: "rgba(91,99,230,0.09)",
  primarySubtle: "rgba(91,99,230,0.22)",
  amber: "#B45309",
  amberLight: "rgba(180,83,9,0.10)",
  coral: "#E05252",
  coralLight: "#FEE2E2",
  sky: "#0EA5E9",
  skyLight: "#E0F2FE",
  plum: "#8B5CF6",
  plumLight: "#EDE9FE",
  green: "#10B981",
  greenLight: "rgba(16,185,129,0.10)",
  white: "#FFFFFF",
  danger: "#E05252",
  success: "#10B981",
  successLight: "rgba(16,185,129,0.10)",
  warning: "#B45309",
  overlay: "rgba(9, 9, 11, 0.4)",
  // Per-course tints (progress bars only)
  tintHtml: "#2E6BEA",
  tintReact: "#7A4EE3",
  tintBackend: "#0F9B6E",
  tintTest: "#C06A2E",
} as const;

// Dark theme — Linear-inspired near-black, single indigo accent
// Surfaces use semi-transparent white for glassmorphic layering
export const darkColors = {
  canvas: "#08090B",
  canvasElevated: "rgba(255,255,255,0.035)",
  canvasDeep: "#050608",
  surface2: "rgba(255,255,255,0.055)",
  ink: "#F2F2F5",
  inkMuted: "#A8A8AE",
  inkSoft: "#717178",
  inkFaint: "#4D4D54",
  border: "rgba(255,255,255,0.06)",
  line: "rgba(255,255,255,0.06)",
  lineHi: "rgba(255,255,255,0.10)",
  primary: "#8B93F8",
  primaryDark: "#5B63E6",
  primaryLight: "rgba(139,147,248,0.12)",
  primarySubtle: "rgba(139,147,248,0.22)",
  amber: "#F59E0B",
  amberLight: "rgba(245,158,11,0.14)",
  coral: "#F87171",
  coralLight: "rgba(248,113,113,0.14)",
  sky: "#38BDF8",
  skyLight: "#0C4A6E",
  plum: "#A78BFA",
  plumLight: "#4C1D95",
  green: "#34D399",
  greenLight: "rgba(52,211,153,0.14)",
  white: "#FFFFFF",
  danger: "#F87171",
  success: "#34D399",
  successLight: "rgba(52,211,153,0.14)",
  warning: "#F59E0B",
  overlay: "rgba(0, 0, 0, 0.7)",
  // Per-course tints (progress bars only)
  tintHtml: "#6EA8FE",
  tintReact: "#B197FC",
  tintBackend: "#34D399",
  tintTest: "#FBBF77",
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
