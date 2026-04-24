import { StyleSheet, View } from "react-native";
import {
  CalendarDays,
  CalendarOff,
  FileText,
  PlayCircle,
} from "lucide-react-native";

import type { ScheduleEvent } from "~/types/tutly";
import { AppText } from "~/components/ui/AppText";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { spacing } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";

type EventCardProps = {
  event: ScheduleEvent;
};

export function EventCard({ event }: EventCardProps) {
  const { colors } = useTheme();
  const Icon =
    event.type === "Assignment"
      ? FileText
      : event.type === "Holiday"
        ? CalendarOff
        : PlayCircle;
  const tone =
    event.type === "Assignment"
      ? "amber"
      : event.type === "Holiday"
        ? "coral"
        : "primary";

  return (
    <Card style={styles.card}>
      <View style={[styles.icon, { backgroundColor: `${colors.primary}08` }]}>
        <Icon color={colors.primary} size={19} strokeWidth={2} />
      </View>
      <View style={styles.copy}>
        <Chip tone={tone}>{event.type}</Chip>
        <AppText variant="subtitle">{event.name}</AppText>
        {event.description ? (
          <AppText muted numberOfLines={2}>
            {event.description}
          </AppText>
        ) : null}
        <View style={styles.time}>
          <CalendarDays color={colors.inkSoft} size={13} />
          <AppText muted variant="caption">
            {new Date(event.startDate).toLocaleString()}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
  },
  icon: {
    alignItems: "center",
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  time: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
});
