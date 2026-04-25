import { View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import type { ScheduleEvent } from "~/types/tutly";
import { AppText } from "~/components/ui/AppText";
import { GlassView } from "~/components/ui/GlassView";
import { useTheme } from "~/lib/theme/use-theme";

type EventCardProps = {
  event: ScheduleEvent;
};

export function EventCard({ event }: EventCardProps) {
  const { colors } = useTheme();
  const isLive = event.type === "Class" || event.type === "Live class";
  const startDate = new Date(event.startDate);
  const timeStr = startDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <GlassView
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 14,
      }}
    >
      {/* Time */}
      <View style={{ alignItems: "center", minWidth: 42 }}>
        <AppText style={{ fontSize: 14, fontWeight: "600", letterSpacing: -0.1 }}>
          {timeStr}
        </AppText>
        <AppText style={{ fontSize: 10, color: colors.inkFaint, marginTop: 2 }}>
          {event.type}
        </AppText>
      </View>

      {/* Separator */}
      <View style={{ width: 1, height: 34, backgroundColor: colors.line }} />

      {/* Content */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText
          numberOfLines={1}
          style={{ fontSize: 14, fontWeight: "600", letterSpacing: -0.1, marginBottom: 2 }}
        >
          {event.name}
        </AppText>
        <AppText numberOfLines={1} style={{ fontSize: 11, color: colors.inkSoft }}>
          {event.description || event.type}
        </AppText>
      </View>

      {isLive ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 3 }}>
          <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: colors.success }} />
          <AppText style={{ fontSize: 10, fontWeight: "600", color: colors.success }}>Live</AppText>
        </View>
      ) : (
        <ChevronRight color={colors.inkFaint} size={14} />
      )}
    </GlassView>
  );
}
