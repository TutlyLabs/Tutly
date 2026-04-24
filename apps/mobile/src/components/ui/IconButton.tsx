import type { LucideIcon } from "lucide-react-native";
import type { PressableProps } from "react-native";
import { Pressable, StyleSheet } from "react-native";

import { radius } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";

type IconButtonProps = PressableProps & {
  icon: LucideIcon;
  size?: number;
};

export function IconButton({
  icon: Icon,
  size = 44,
  style,
  ...props
}: IconButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: colors.canvasElevated,
          borderColor: colors.border,
          height: size,
          opacity: pressed ? 0.72 : 1,
          width: size,
        },
        style as object,
      ]}
    >
      <Icon color={colors.ink} size={20} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
  },
});
