import { Pressable, StyleSheet, View } from "react-native";
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
import { spacing } from "~/lib/theme/tokens";
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
      <View style={styles.list}>
        {notifications.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => notificationActions.toggleRead.mutate(item.id)}
          >
            {({ pressed }) => (
              <Card style={[styles.card, pressed && { opacity: 0.7 }]}>
                <Circle
                  color={item.readAt ? colors.inkSoft : colors.coral}
                  fill={item.readAt ? "transparent" : colors.coral}
                  size={8}
                />
                <View style={styles.copy}>
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

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  card: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
});
