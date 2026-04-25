import { Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import {
  Bell,
  BookMarked,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileText,
  Flame,
  GraduationCap,
  LogOut,
  Menu as MenuIcon,
  Moon,
  NotebookTabs,
  Sun,
  Trophy,
  UserRound,
} from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { GlassView } from "~/components/ui/GlassView";
import { Screen } from "~/components/ui/Screen";
import { useAuth } from "~/lib/auth/auth-provider";
import { env } from "~/lib/env";
import { useTheme } from "~/lib/theme/use-theme";

export default function MenuScreen() {
  const { colors, isDark, mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const isTutor = user?.role === "MENTOR" || user?.role === "INSTRUCTOR" || user?.role === "ADMIN";

  const learningItems = [
    { Icon: FileText, label: "Assignments", detail: "3 pending", href: "/assignments" as const },
    { Icon: ClipboardCheck, label: "Attendance", detail: "92%", href: "/attendance" as const },
    { Icon: NotebookTabs, label: "Notes", detail: "18", href: "/notes" as const },
    { Icon: BookMarked, label: "Bookmarks", detail: "7", href: "/bookmarks" as const },
    { Icon: Download, label: "Downloads", detail: "4 files", href: "/downloads" as const },
  ];

  const accountItems = [
    { Icon: UserRound, label: "Profile", href: "/profile" as const },
    { Icon: Bell, label: "Notifications", detail: "On", href: "/notifications" as const },
    ...(isTutor ? [{ Icon: MenuIcon, label: "Instructor Panel", href: "/tutor" as const }] : []),
  ];

  return (
    <Screen>
      {/* Header */}
      <View style={{ paddingVertical: 4 }}>
        <AppText style={{ fontSize: 26, fontWeight: "600", letterSpacing: -0.78, lineHeight: 30 }}>
          More
        </AppText>
      </View>

      {/* Profile card */}
      <GlassView borderRadius={16} style={{
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}>
        <View style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          backgroundColor: colors.surface2,
          borderWidth: 1,
          borderColor: colors.line,
          alignItems: "center",
          justifyContent: "center",
        }}>
          <AppText style={{ fontSize: 20, fontWeight: "600", color: colors.ink, letterSpacing: -0.3 }}>
            {user?.name?.[0]?.toUpperCase() || "T"}
          </AppText>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText numberOfLines={1} style={{ fontSize: 15, fontWeight: "600", letterSpacing: -0.1, marginBottom: 3 }}>
            {user?.name || user?.username || "User"}
          </AppText>
          <AppText numberOfLines={1} style={{ fontSize: 11, color: colors.inkSoft }}>
            {user?.email || user?.username} · {user?.role || "Student"}
          </AppText>
        </View>
        <ChevronRight color={colors.inkFaint} size={14} />
      </GlassView>

      {/* Micro stats row */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <MicroStat Icon={Flame} label="Streak" value="12d" colors={colors} />
        <MicroStat Icon={Trophy} label="XP" value="405" colors={colors} />
        <MicroStat Icon={GraduationCap} label="Courses" value="4" colors={colors} />
      </View>

      {/* Learning section */}
      <View>
        <AppText style={{
          fontSize: 10,
          color: colors.inkFaint,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          paddingHorizontal: 4,
          paddingBottom: 8,
          fontWeight: "600",
        }}>
          Learning
        </AppText>
        <GroupedList items={learningItems} colors={colors} />
      </View>

      {/* Account section */}
      <View>
        <AppText style={{
          fontSize: 10,
          color: colors.inkFaint,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          paddingHorizontal: 4,
          paddingBottom: 8,
          fontWeight: "600",
        }}>
          Account
        </AppText>
        <GroupedList items={accountItems} colors={colors} />
      </View>

      {/* Appearance */}
      <View>
        <AppText style={{
          fontSize: 10,
          color: colors.inkFaint,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          paddingHorizontal: 4,
          paddingBottom: 8,
          fontWeight: "600",
        }}>
          Appearance
        </AppText>
        <GlassView borderRadius={14} style={{
          flexDirection: "row",
          padding: 4,
          gap: 4,
        }}>
          {(["light", "dark", "system"] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={{ flex: 1 }}>
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: mode === m ? colors.primaryLight : "transparent",
              }}>
                {m === "light" && <Sun color={mode === m ? colors.primary : colors.inkSoft} size={16} strokeWidth={1.7} />}
                {m === "dark" && <Moon color={mode === m ? colors.primary : colors.inkSoft} size={16} strokeWidth={1.7} />}
                <AppText style={{
                  fontSize: 13,
                  fontWeight: mode === m ? "600" : "400",
                  color: mode === m ? colors.primary : colors.inkSoft,
                  textTransform: "capitalize",
                }}>
                  {m}
                </AppText>
              </View>
            </Pressable>
          ))}
        </GlassView>
      </View>

      {/* Log out */}
      <Pressable onPress={signOut}>
        {({ pressed }) => (
          <GlassView style={{
            padding: 14,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 10,
            opacity: pressed ? 0.7 : 1,
          }}>
            <LogOut color={colors.danger} size={16} strokeWidth={1.7} />
            <AppText style={{ color: colors.danger, fontSize: 14, fontWeight: "500", letterSpacing: -0.1 }}>
              Log out
            </AppText>
          </GlassView>
        )}
      </Pressable>

      {/* Footer */}
      <AppText style={{ textAlign: "center", fontSize: 10, color: colors.inkFaint, marginTop: 4 }}>
        Tutly · v1.0.0
      </AppText>

      <View style={{ height: 40 }} />
    </Screen>
  );
}

function MicroStat({ Icon, label, value, colors }: { Icon: any; label: string; value: string; colors: any }) {
  return (
    <GlassView borderRadius={12} style={{
      flex: 1,
      padding: 10,
      paddingHorizontal: 12,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Icon color={colors.inkFaint} size={14} strokeWidth={1.7} />
        <AppText style={{ fontSize: 10, color: colors.inkFaint, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: "600" }}>
          {label}
        </AppText>
      </View>
      <AppText style={{ fontSize: 18, fontWeight: "600", letterSpacing: -0.3, color: colors.ink }}>
        {value}
      </AppText>
    </GlassView>
  );
}

function GroupedList({ items, colors }: { items: { Icon: any; label: string; detail?: string; href: string }[]; colors: any }) {
  return (
    <GlassView borderRadius={14} style={{}}>

      {items.map((item, i) => (
        <Pressable key={item.label} onPress={() => router.push(item.href)}>
          {({ pressed }) => (
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 13,
              paddingHorizontal: 14,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.line,
              opacity: pressed ? 0.7 : 1,
            }}>
              <View style={{ width: 20, alignItems: "center" }}>
                <item.Icon color={colors.inkMuted} size={18} strokeWidth={1.7} />
              </View>
              <AppText style={{ flex: 1, fontSize: 14, fontWeight: "500", letterSpacing: -0.1 }}>
                {item.label}
              </AppText>
              {item.detail && (
                <AppText style={{ fontSize: 12, color: colors.inkSoft }}>{item.detail}</AppText>
              )}
              <ChevronRight color={colors.inkFaint} size={14} />
            </View>
          )}
        </Pressable>
      ))}
    </GlassView>
  );
}
