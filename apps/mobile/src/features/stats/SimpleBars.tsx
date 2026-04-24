import { View } from "react-native";

import { AppText } from "~/components/ui/AppText";
import { useTheme } from "~/lib/theme/use-theme";

type BarItem = {
  label: string;
  value: number;
  tone?: "primary" | "amber" | "coral" | "sky" | "plum";
};

type SimpleBarsProps = {
  items: BarItem[];
};

export function SimpleBars({ items }: SimpleBarsProps) {
  const { colors } = useTheme();
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <View className="gap-md">
      {items.map((item) => {
        const color =
          item.tone === "amber"
            ? colors.amber
            : item.tone === "coral"
              ? colors.coral
              : item.tone === "sky"
                ? colors.sky
                : item.tone === "plum"
                  ? colors.plum
                  : colors.primary;

        return (
          <View key={item.label} className="gap-sm">
            <View className="flex-row justify-between">
              <AppText muted variant="caption">
                {item.label}
              </AppText>
              <AppText variant="caption">{item.value}</AppText>
            </View>
            <View className="rounded-pill h-[12px] overflow-hidden" style={{ backgroundColor: colors.border }}>
              <View
                className="rounded-pill h-full"
                style={{
                  backgroundColor: color,
                  width: `${Math.max(8, (item.value / max) * 100)}%`,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
