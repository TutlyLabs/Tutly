import { Pressable, StyleSheet, View } from "react-native";
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
import { spacing } from "~/lib/theme/tokens";
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
      <Card elevated style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <AppText style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>
            {user?.name?.[0]?.toUpperCase() || "T"}
          </AppText>
        </View>
        <View style={styles.profileCopy}>
          <Chip tone="primary">{user?.role || "Tutly"}</Chip>
          <AppText variant="subtitle">{user?.name || user?.username}</AppText>
          <AppText muted variant="caption">
            {user?.email || user?.username}
          </AppText>
        </View>
      </Card>

      <View style={styles.list}>
        {visibleItems.map((item) => (
          <Pressable key={item.title} onPress={() => router.push(item.href)}>
            {({ pressed }) => (
              <Card style={[styles.row, pressed && { opacity: 0.7 }]}>
                <View style={styles.rowLeft}>
                  <item.icon color={colors.inkMuted} size={19} strokeWidth={2} />
                  <AppText>{item.title}</AppText>
                </View>
                <ChevronRight color={colors.inkSoft} size={16} />
              </Card>
            )}
          </Pressable>
        ))}
      </View>

      <Card style={styles.webCard}>
        <View style={styles.rowLeft}>
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

      <View style={styles.section}>
        <AppText variant="subtitle" style={styles.sectionTitle}>Appearance</AppText>
        <Card style={styles.themeRow}>
          <Pressable
            style={[styles.themeOption, mode === "light" && { backgroundColor: colors.primaryLight }]}
            onPress={() => setMode("light")}
          >
            <Sun color={mode === "light" ? colors.primaryDark : colors.inkSoft} size={20} />
            <AppText style={mode === "light" ? { color: colors.primaryDark, fontWeight: "600" } : { color: colors.inkSoft }}>Light</AppText>
          </Pressable>
          <Pressable
            style={[styles.themeOption, mode === "dark" && { backgroundColor: colors.primaryLight }]}
            onPress={() => setMode("dark")}
          >
            <Moon color={mode === "dark" ? colors.primaryDark : colors.inkSoft} size={20} />
            <AppText style={mode === "dark" ? { color: colors.primaryDark, fontWeight: "600" } : { color: colors.inkSoft }}>Dark</AppText>
          </Pressable>
          <Pressable
            style={[styles.themeOption, mode === "system" && { backgroundColor: colors.primaryLight }]}
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

const styles = StyleSheet.create({
  profile: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 20,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  profileCopy: {
    flex: 1,
    gap: 2,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
  },
  webCard: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    paddingHorizontal: spacing.sm,
  },
  themeRow: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
  },
  themeOption: {
    alignItems: "center",
    borderRadius: spacing.sm,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
});
