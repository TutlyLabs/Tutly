import { View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Clock3 } from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { Card } from "~/components/ui/Card";
import { EmptyState } from "~/components/ui/EmptyState";
import { PageHeader } from "~/components/ui/PageHeader";
import { Screen } from "~/components/ui/Screen";
import { SectionHeader } from "~/components/ui/SectionHeader";
import { EventCard } from "~/features/schedule/EventCard";
import { useSchedule } from "~/lib/api/hooks";
import { selectScheduleEvents } from "~/lib/api/mobile-selectors";
import { queryKeys } from "~/lib/api/query-keys";
import { useTheme } from "~/lib/theme/use-theme";

export default function ScheduleScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const scheduleQuery = useSchedule();
  const events = selectScheduleEvents(scheduleQuery.data).sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);
  const todayEvents = events.filter((event) => {
    const start = new Date(event.startDate).getTime();
    return start >= todayStart.getTime() && start <= todayEnd.getTime();
  });
  const upcomingEvents = events.filter(
    (event) => new Date(event.startDate).getTime() > todayEnd.getTime(),
  );

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.schedule });
  };

  return (
    <Screen onRefresh={refresh} refreshing={scheduleQuery.isFetching}>
      <PageHeader title="Schedule" />
      <View className="gap-sm">
        <SectionHeader action={`${todayEvents.length}`} title="Today" />
        {todayEvents.length ? (
          todayEvents.map((event, index) => (
            <EventCard
              event={event}
              key={`${event.type}-${event.name}-${index}`}
            />
          ))
        ) : (
          <Card className="flex-row items-center gap-sm">
            <Clock3 color={colors.inkSoft} size={16} />
            <AppText muted>No events today</AppText>
          </Card>
        )}
      </View>
      <View className="gap-sm">
        <SectionHeader
          action={`${upcomingEvents.length}`}
          title="Upcoming"
        />
        {upcomingEvents.map((event, index) => (
          <EventCard
            event={event}
            key={`${event.type}-${event.name}-${index}`}
          />
        ))}
      </View>
      {!events.length && !scheduleQuery.isLoading ? (
        <EmptyState
          body="Classes and assignments will appear here."
          icon={CalendarClock}
          title="No schedule yet"
        />
      ) : null}
    </Screen>
  );
}
