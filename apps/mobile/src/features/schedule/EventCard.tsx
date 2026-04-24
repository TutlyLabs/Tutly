import { View } from "react-native";
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
    <Card className="flex-row gap-md">
      <View
        className="items-center rounded-[10px] h-[38px] justify-center w-[38px]"
        style={{ backgroundColor: `${colors.primary}08` }}
      >
        <Icon color={colors.primary} size={19} strokeWidth={2} />
      </View>
      <View className="flex-1 gap-xs">
        <Chip tone={tone}>{event.type}</Chip>
        <AppText variant="subtitle">{event.name}</AppText>
        {event.description ? (
          <AppText muted numberOfLines={2}>
            {event.description}
          </AppText>
        ) : null}
        <View className="flex-row items-center gap-xs">
          <CalendarDays color={colors.inkSoft} size={13} />
          <AppText muted variant="caption">
            {new Date(event.startDate).toLocaleString()}
          </AppText>
        </View>
      </View>
    </Card>
  );
}
