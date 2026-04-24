import { View } from "react-native";
import { router, usePathname } from "expo-router";
import { ArrowLeft, Bell } from "lucide-react-native";

import { useNotifications } from "~/lib/api/hooks";
import { selectNotifications } from "~/lib/api/mobile-selectors";
import { useAuth } from "~/lib/auth/auth-provider";
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
    <View className="flex-row items-center gap-md justify-between py-xs">
      <View className="flex-row items-center flex-1 gap-sm">
        {showBack ? (
          <IconButton icon={ArrowLeft} onPress={() => router.back()} />
        ) : null}
        <View className="flex-1 gap-[2px]">
          {eyebrow ? (
            <AppText muted variant="caption">
              {eyebrow}
            </AppText>
          ) : null}
          <AppText variant="title">{title}</AppText>
        </View>
      </View>
      <View className="flex-row gap-sm">
        {!hideBell ? (
          <View className="relative">
            <IconButton
              icon={Bell}
              onPress={() => router.push("/notifications")}
            />
            {unreadCount ? (
              <View className="absolute -right-[3px] -top-[3px] items-center rounded-pill min-w-[18px] px-[4px] py-[1px]" style={{ backgroundColor: "#EF4444" }}>
                <AppText style={{ color: "#FFFFFF", fontSize: 9, lineHeight: 12, textAlign: "center" }} variant="caption">
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
