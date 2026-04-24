import { Pressable, View } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import {
  Bell,
  BookMarked,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileText,
  Globe2,
  LogOut,
  Moon,
  NotebookTabs,
  Sun,
  UserCog,
  UserRound,
} from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { PageHeader } from "~/components/ui/PageHeader";
import { Screen } from "~/components/ui/Screen";
import { useAuth } from "~/lib/auth/auth-provider";
import { env } from "~/lib/env";
import { useTheme } from "~/lib/theme/use-theme";

const menuItems = [
  { title: "Assignments", icon: FileText, href: "/assignments" },
  { title: "Attendance", icon: ClipboardCheck, href: "/attendance" },
  { title: "Notes", icon: NotebookTabs, href: "/notes" },
  { title: "Instructor", icon: UserCog, href: "/tutor" },
  { title: "Profile", icon: UserRound, href: "/profile" },
  { title: "Notifications", icon: Bell, href: "/notifications" },
  { title: "Bookmarks", icon: BookMarked, href: "/bookmarks" },
  { title: "Downloads", icon: Download, href: "/downloads" },
] as const;

export default function MenuScreen() {
  const { colors, mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const isTutor =
    user?.role === "MENTOR" ||
    user?.role === "INSTRUCTOR" ||
    user?.role === "ADMIN";
  const visibleItems = menuItems.filter((item) =>
    item.href === "/tutor" ? isTutor : true,
  );

  return (
    <Screen>
      <PageHeader title="More" />
      <Card elevated className="flex-row items-center gap-md">
        <View
          className="items-center rounded-[20px] h-[56px] justify-center w-[56px]"
          style={{ backgroundColor: colors.primary }}
        >
          <AppText style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>
            {user?.name?.[0]?.toUpperCase() || "T"}
          </AppText>
        </View>
        <View className="flex-1 gap-[2px]">
          <Chip tone="primary">{user?.role || "Tutly"}</Chip>
          <AppText variant="subtitle">{user?.name || user?.username}</AppText>
          <AppText muted variant="caption">
            {user?.email || user?.username}
          </AppText>
        </View>
      </Card>

      <View className="gap-sm">
        {visibleItems.map((item) => (
          <Pressable key={item.title} onPress={() => router.push(item.href)}>
            {({ pressed }) => (
              <Card className="flex-row items-center justify-between" style={pressed ? { opacity: 0.7 } : undefined}>
                <View className="flex-row items-center flex-1 gap-md">
                  <item.icon color={colors.inkMuted} size={19} strokeWidth={2} />
                  <AppText>{item.title}</AppText>
                </View>
                <ChevronRight color={colors.inkSoft} size={16} />
              </Card>
            )}
          </Pressable>
        ))}
      </View>

      <Card className="gap-md">
        <View className="flex-row items-center flex-1 gap-md">
          <Globe2 color={colors.sky} size={19} strokeWidth={2} />
          <View>
            <AppText variant="body">Tutly Web</AppText>
            <AppText muted variant="caption">
              Submissions, playgrounds, and reports
            </AppText>
          </View>
        </View>
        <Button
          onPress={() => Linking.openURL(env.webUrl)}
          tone="secondary"
        >
          Open
        </Button>
      </Card>

      <View className="gap-sm">
        <AppText variant="subtitle" className="px-sm">Appearance</AppText>
        <Card className="flex-row gap-xs p-xs">
          <Pressable
            className="flex-row items-center flex-1 justify-center gap-sm py-sm rounded-sm"
            style={mode === "light" ? { backgroundColor: colors.primaryLight } : undefined}
            onPress={() => setMode("light")}
          >
            <Sun color={mode === "light" ? colors.primaryDark : colors.inkSoft} size={20} />
            <AppText style={mode === "light" ? { color: colors.primaryDark, fontWeight: "600" } : { color: colors.inkSoft }}>Light</AppText>
          </Pressable>
          <Pressable
            className="flex-row items-center flex-1 justify-center gap-sm py-sm rounded-sm"
            style={mode === "dark" ? { backgroundColor: colors.primaryLight } : undefined}
            onPress={() => setMode("dark")}
          >
            <Moon color={mode === "dark" ? colors.primaryDark : colors.inkSoft} size={20} />
            <AppText style={mode === "dark" ? { color: colors.primaryDark, fontWeight: "600" } : { color: colors.inkSoft }}>Dark</AppText>
          </Pressable>
          <Pressable
            className="flex-row items-center flex-1 justify-center gap-sm py-sm rounded-sm"
            style={mode === "system" ? { backgroundColor: colors.primaryLight } : undefined}
            onPress={() => setMode("system")}
          >
            <AppText style={mode === "system" ? { color: colors.primaryDark, fontWeight: "600" } : { color: colors.inkSoft }}>System</AppText>
          </Pressable>
        </Card>
      </View>

      <Button icon={LogOut} onPress={signOut} tone="danger">
        Sign out
      </Button>
    </Screen>
  );
}
