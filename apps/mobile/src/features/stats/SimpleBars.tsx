import { StyleSheet, View } from "react-native";

import { AppText } from "~/components/ui/AppText";
import { spacing } from "~/lib/theme/tokens";
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
    <View style={styles.wrap}>
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
          <View key={item.label} style={styles.row}>
            <View style={styles.label}>
              <AppText muted variant="caption">
                {item.label}
              </AppText>
              <AppText variant="caption">{item.value}</AppText>
            </View>
            <View style={[styles.track, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: color,
                    width: `${Math.max(8, (item.value / max) * 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.sm,
  },
  label: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  track: {
    borderRadius: 999,
    height: 12,
    overflow: "hidden",
  },
  bar: {
    borderRadius: 999,
    height: "100%",
  },
});
