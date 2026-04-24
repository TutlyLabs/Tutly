import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Clock3, PlayCircle, Radio } from "lucide-react-native";

import type { ClassSummary } from "~/types/tutly";
import { AppText } from "~/components/ui/AppText";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { spacing } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";

type ClassCardProps = {
  item: ClassSummary;
};

export function ClassCard({ item }: ClassCardProps) {
  const { colors } = useTheme();
  const isLive = item.classType === "LIVE";

  return (
    <Pressable onPress={() => router.push(`/class/${item.id}`)}>
      {({ pressed }) => (
        <Card style={[styles.card, pressed && { opacity: 0.74 }]}>
          <View
            style={[
              styles.marker,
              { backgroundColor: isLive ? colors.coral : colors.primary },
            ]}
          />
          <View style={styles.copy}>
            <View style={styles.top}>
              <Chip
                icon={isLive ? Radio : PlayCircle}
                tone={isLive ? "coral" : "primary"}
              >
                {isLive ? "Live class" : item.video?.videoType || "Recording"}
              </Chip>
              {item.Folder?.title ? (
                <Chip tone="neutral">{item.Folder.title}</Chip>
              ) : null}
            </View>
            <AppText variant="subtitle">{item.title}</AppText>
            <View style={styles.meta}>
              <Clock3 color={colors.inkMuted} size={15} />
              <AppText muted variant="caption">
                {new Date(
                  item.startTime || item.createdAt || Date.now(),
                ).toLocaleString()}
              </AppText>
            </View>
          </View>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
    overflow: "hidden",
  },
  marker: {
    borderRadius: 999,
    width: 6,
  },
  copy: {
    flex: 1,
    gap: spacing.sm,
  },
  top: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  meta: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
});
