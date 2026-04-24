import type { LucideIcon } from "lucide-react-native";
import type { PressableProps } from "react-native";
import { Pressable, View } from "react-native";

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
    <Pressable {...props} style={style}>
      {({ pressed }) => (
        <View
          style={{
            alignItems: "center",
            borderRadius: 999,
            borderStyle: "solid",
            borderWidth: 1,
            justifyContent: "center",
            backgroundColor: colors.canvasElevated,
            borderColor: colors.border,
            height: size,
            opacity: pressed ? 0.72 : 1,
            width: size,
          }}
        >
          <Icon color={colors.ink} size={20} strokeWidth={2.4} />
        </View>
      )}
    </Pressable>
  );
}
