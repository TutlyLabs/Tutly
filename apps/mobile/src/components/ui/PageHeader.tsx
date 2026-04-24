import { StyleSheet, View } from "react-native";
import { router, usePathname } from "expo-router";
import { ArrowLeft, Bell } from "lucide-react-native";

import { useNotifications } from "~/lib/api/hooks";
import { selectNotifications } from "~/lib/api/mobile-selectors";
import { useAuth } from "~/lib/auth/auth-provider";
import { spacing } from "~/lib/theme/tokens";
import { AppText } from "./AppText";
import { IconButton } from "./IconButton";

type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  showBack?: boolean;
};

export function PageHeader({
  title,
  eyebrow,
  showBack = false,
}: PageHeaderProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const notificationsQuery = useNotifications();
  const unreadCount = selectNotifications(notificationsQuery.data).filter(
    (item) => !item.readAt,
  ).length;
  const hideBell = pathname === "/notifications";

  return (
    <View style={styles.wrap}>
      <View style={styles.leading}>
        {showBack ? (
          <IconButton icon={ArrowLeft} onPress={() => router.back()} />
        ) : null}
        <View style={styles.copy}>
          {eyebrow ? (
            <AppText muted variant="caption">
              {eyebrow}
            </AppText>
          ) : null}
          <AppText variant="title">{title}</AppText>
        </View>
      </View>
      <View style={styles.actions}>
        {!hideBell ? (
          <View style={styles.bellWrap}>
            <IconButton
              icon={Bell}
              onPress={() => router.push("/notifications")}
            />
            {unreadCount ? (
              <View style={styles.badge}>
                <AppText style={styles.badgeLabel} variant="caption">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </AppText>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  leading: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  bellWrap: {
    position: "relative",
  },
  badge: {
    alignItems: "center",
    backgroundColor: "#EF4444",
    borderRadius: 999,
    minWidth: 18,
    paddingHorizontal: 4,
    paddingVertical: 1,
    position: "absolute",
    right: -3,
    top: -3,
  },
  badgeLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    lineHeight: 12,
    textAlign: "center",
  },
});
