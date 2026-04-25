import { useMemo } from "react";
import { View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarClock } from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { EmptyState } from "~/components/ui/EmptyState";
import { GlassView } from "~/components/ui/GlassView";
import { IconButton } from "~/components/ui/IconButton";
import { Screen } from "~/components/ui/Screen";
import { SectionHeader } from "~/components/ui/SectionHeader";
import { useSchedule } from "~/lib/api/hooks";
import { selectScheduleEvents } from "~/lib/api/mobile-selectors";
import { queryKeys } from "~/lib/api/query-keys";
import { useTheme } from "~/lib/theme/use-theme";

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  const dates: number[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.getDate());
  }
  return dates;
}

function getTodayIdx() {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

export default function ScheduleScreen() {
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();
  const scheduleQuery = useSchedule();
  const events = selectScheduleEvents(scheduleQuery.data).sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  const todayEvents = events.filter((e) => {
    const start = new Date(e.startDate).getTime();
    return start >= todayStart.getTime() && start <= todayEnd.getTime();
  });
  const tomorrowStart = new Date(todayEnd.getTime() + 1);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);
  const tomorrowEvents = events.filter((e) => {
    const start = new Date(e.startDate).getTime();
    return start >= tomorrowStart.getTime() && start <= tomorrowEnd.getTime();
  });

  const dates = useMemo(getWeekDates, []);
  const todayIdx = getTodayIdx();
  const monthYear = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const tints = [colors.tintReact, colors.tintHtml, colors.tintBackend, colors.amber] as string[];

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.schedule });
  };

  return (
    <Screen onRefresh={refresh} refreshing={scheduleQuery.isFetching}>
      {/* Big header */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingVertical: 4 }}>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 30, fontWeight: "700", letterSpacing: -0.9, lineHeight: 34, marginBottom: 6 }}>
            Schedule
          </AppText>
          <AppText style={{ fontSize: 12, color: colors.inkSoft }}>{monthYear}</AppText>
        </View>
        <IconButton icon={Bell} onPress={() => {}} />
      </View>

      {/* Day strip */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 6 }}>
        {DAY_LABELS.map((d, i) => {
          const active = i === todayIdx;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 14,
                alignItems: "center",
                backgroundColor: active ? colors.primarySubtle : "transparent",
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.line,
              }}
            >
              <AppText style={{
                fontSize: 9,
                fontWeight: "700",
                letterSpacing: 0.8,
                color: active ? colors.primary : colors.inkSoft,
                marginBottom: 3,
              }}>
                {d}
              </AppText>
              <AppText style={{
                fontSize: 16,
                fontWeight: "700",
                letterSpacing: -0.3,
                color: active ? colors.primary : colors.ink,
              }}>
                {dates[i]}
              </AppText>
              {/* Event dot */}
              <View style={{
                width: 4,
                height: 4,
                borderRadius: 999,
                marginTop: 4,
                backgroundColor: active ? colors.primary : i < todayIdx ? tints[i % tints.length]! : "transparent",
              }} />
            </View>
          );
        })}
      </View>

      {/* Today */}
      <SectionHeader title="Today" action={`${todayEvents.length} events`} />
      {todayEvents.length ? (
        <View style={{ gap: 10 }}>
          {todayEvents.map((event, i) => (
            <TimelineItem key={`today-${i}`} event={event} tint={tints[i % tints.length]!} colors={colors} isDark={isDark} />
          ))}
        </View>
      ) : (
        <GlassView style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16 }}>
          <AppText style={{ color: colors.inkSoft }}>No events today</AppText>
        </GlassView>
      )}

      {/* Tomorrow */}
      {tomorrowEvents.length > 0 && (
        <>
          <SectionHeader title="Tomorrow" />
          <View style={{ gap: 10 }}>
            {tomorrowEvents.map((event, i) => (
              <TimelineItem key={`tmrw-${i}`} event={event} tint={tints[(i + 1) % tints.length]!} colors={colors} isDark={isDark} />
            ))}
          </View>
        </>
      )}

      {!events.length && !scheduleQuery.isLoading ? (
        <EmptyState
          body="Classes and assignments will appear here."
          icon={CalendarClock}
          title="No schedule yet"
        />
      ) : null}

      <View style={{ height: 40 }} />
    </Screen>
  );
}

function TimelineItem({ event, tint, colors, isDark }: { event: any; tint: string; colors: any; isDark: boolean }) {
  const isLive = event.type === "Live class" || event.type === "Class";
  const startDate = new Date(event.startDate);
  const timeStr = startDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const bar = tint || colors.inkMuted;

  return (
    <GlassView borderRadius={16} style={{
      position: "relative",
      flexDirection: "row",
      alignItems: "stretch",
    }}>
      {/* Left accent bar */}
      <View style={{ width: 3, backgroundColor: bar }} />

      {/* Time block */}
      <View style={{
        padding: 14,
        justifyContent: "center",
        minWidth: 76,
        borderRightWidth: 1,
        borderRightColor: colors.line,
      }}>
        <AppText style={{ fontSize: 16, fontWeight: "700", letterSpacing: -0.3, lineHeight: 18 }}>
          {timeStr}
        </AppText>
        <AppText style={{ fontSize: 11, color: colors.inkFaint, marginTop: 4 }}>
          {event.type || "Event"}
        </AppText>
      </View>

      {/* Title block */}
      <View style={{ flex: 1, minWidth: 0, padding: 12, paddingLeft: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", letterSpacing: -0.1, marginBottom: 2 }}>
            {event.name}
          </AppText>
          <AppText numberOfLines={1} style={{ fontSize: 11, color: colors.inkSoft }}>
            {event.description || event.type}
          </AppText>
        </View>

        {isLive && (
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: colors.danger,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
          }}>
            <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: "#FFFFFF" }} />
            <AppText style={{ fontSize: 9, fontWeight: "700", letterSpacing: 0.8, color: "#FFFFFF" }}>
              LIVE
            </AppText>
          </View>
        )}
      </View>
    </GlassView>
  );
}
