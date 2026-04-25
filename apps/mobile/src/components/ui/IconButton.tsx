import type { LucideIcon } from "lucide-react-native";
import type { PressableProps } from "react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

import { useTheme } from "~/lib/theme/use-theme";

type IconButtonProps = PressableProps & {
  icon: LucideIcon;
  size?: number;
};

export function IconButton({
  icon: Icon,
  size = 38,
  style,
  ...props
}: IconButtonProps) {
  const { colors, isDark } = useTheme();

  return (
    <Pressable {...props} style={style}>
      {({ pressed }) => (
        <View
          style={{
            alignItems: "center",
            borderRadius: 999,
            borderWidth: 1,
            justifyContent: "center",
            backgroundColor: colors.canvasElevated,
            borderColor: colors.line,
            height: size,
            opacity: pressed ? 0.72 : 1,
            width: size,
            overflow: "hidden",
          }}
        >
          {isDark && (
            <BlurView
              intensity={20}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          )}
          <Icon color={colors.inkMuted} size={18} strokeWidth={1.7} />
        </View>
      )}
    </Pressable>
  );
}
