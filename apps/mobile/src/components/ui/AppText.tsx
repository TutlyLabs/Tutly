import type { PropsWithChildren } from "react";
import type { TextProps } from "react-native";
import { Text } from "react-native";

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

const variantClasses: Record<Variant, string> = {
  hero: "text-[30px] font-extrabold leading-[36px]",
  title: "text-[22px] font-bold leading-[28px]",
  subtitle: "text-[16px] font-semibold leading-[22px]",
  body: "text-[14px] font-normal leading-[20px]",
  caption: "text-[12px] font-medium leading-[16px]",
  label: "text-[11px] font-semibold leading-[14px] uppercase tracking-[0.5px]",
  mono: "text-[13px] font-medium leading-[18px]",
};

export function AppText({
  children,
  style,
  className,
  variant = "body",
  muted = false,
  ...props
}: AppTextProps) {
  const { colors } = useTheme();
  const fontFamily =
    variant === "hero" || variant === "title"
      ? font.display
      : variant === "mono"
        ? font.mono
        : font.body;

  return (
    <Text
      {...props}
      className={`tracking-[0px] ${variantClasses[variant]} ${className || ""}`}
      style={[{ fontFamily, color: muted ? colors.inkMuted : colors.ink }, style]}
    >
      {children}
    </Text>
  );
}
