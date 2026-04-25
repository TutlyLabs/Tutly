import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { useTheme } from "~/lib/theme/use-theme";
import { AppText } from "./AppText";

type SectionHeaderProps = {
  title: string;
  action?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <AppText style={{ fontSize: 14, fontWeight: "600", letterSpacing: -0.1, color: colors.ink }}>
        {title}
      </AppText>
      {action ? (
        <Pressable onPress={onAction}>
          {({ pressed }) => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, opacity: pressed ? 0.7 : 1 }}>
              <AppText style={{ fontSize: 12, color: colors.inkSoft }}>
                {action}
              </AppText>
              <ChevronRight color={colors.inkSoft} size={14} />
            </View>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}
