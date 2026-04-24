import { Pressable, View } from "react-native";
import { Stack } from "expo-router";
import { Bell, Circle, ExternalLink, MailCheck } from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { EmptyState } from "~/components/ui/EmptyState";
import { PageHeader } from "~/components/ui/PageHeader";
import { Screen } from "~/components/ui/Screen";
import { useNotificationActions, useNotifications } from "~/lib/api/hooks";
import { selectNotifications } from "~/lib/api/mobile-selectors";
import { useTheme } from "~/lib/theme/use-theme";
import { openWebPath } from "~/lib/web-handoff";

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const notificationsQuery = useNotifications();
  const notificationActions = useNotificationActions();
  const notifications = selectNotifications(notificationsQuery.data);

  return (
    <Screen
      onRefresh={() => void notificationsQuery.refetch()}
      refreshing={notificationsQuery.isFetching}
    >
      <Stack.Screen options={{ title: "Notifications" }} />
      <PageHeader showBack title="Notifications" />
      {!!notifications.length ? (
        <Button
          icon={MailCheck}
          loading={notificationActions.markAllRead.isPending}
          onPress={() => notificationActions.markAllRead.mutate()}
          tone="secondary"
        >
          Mark all as read
        </Button>
      ) : null}
      <View className="gap-sm">
        {notifications.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => notificationActions.toggleRead.mutate(item.id)}
          >
            {({ pressed }) => (
              <Card className="flex-row items-start gap-sm" style={pressed ? { opacity: 0.7 } : undefined}>
                <Circle
                  color={item.readAt ? colors.inkSoft : colors.coral}
                  fill={item.readAt ? "transparent" : colors.coral}
                  size={8}
                />
                <View className="flex-1 gap-xs">
                  <Chip tone={item.readAt ? "neutral" : "coral"}>
                    {item.eventType.replaceAll("_", " ")}
                  </Chip>
                  <AppText>{item.message || "Update"}</AppText>
                  <AppText muted variant="caption">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString()
                      : ""}
                  </AppText>
                  {item.customLink ? (
                    <Button
                      icon={ExternalLink}
                      onPress={() =>
                        openWebPath(item.customLink || "/notifications")
                      }
                      tone="ghost"
                    >
                      Open link
                    </Button>
                  ) : null}
                </View>
              </Card>
            )}
          </Pressable>
        ))}
      </View>
      {!notifications.length && !notificationsQuery.isLoading ? (
        <EmptyState
          body="Your notifications will appear here."
          icon={Bell}
          title="No notifications"
        />
      ) : null}
    </Screen>
  );
}
