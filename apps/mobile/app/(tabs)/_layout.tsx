import { ActivityIndicator, View, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from "react-native";
import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import {
  BarChart3,
  CalendarDays,
  GraduationCap,
  Home,
  Menu,
} from "lucide-react-native";

import { useAuth } from "~/lib/auth/auth-provider";
import { useTheme } from "~/lib/theme/use-theme";
import { AppText } from "~/components/ui/AppText";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TABS = [
  { name: "index", label: "Home", Icon: Home },
  { name: "learn", label: "Learn", Icon: GraduationCap },
  { name: "schedule", label: "Schedule", Icon: CalendarDays },
  { name: "stats", label: "Stats", Icon: BarChart3 },
  { name: "menu", label: "More", Icon: Menu },
];

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={{
        position: "absolute",
        bottom: 18,
        alignSelf: "center",
        height: 54,
        borderRadius: 999,
        backgroundColor: isDark ? "rgba(18,18,22,0.62)" : "rgba(255,255,255,0.72)",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(10,10,18,0.05)",
        shadowColor: isDark ? "#000000" : "#0A0A12",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: isDark ? 0.45 : 0.08,
        shadowRadius: 30,
        elevation: 10,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 5,
        gap: 2,
        overflow: "hidden",
        zIndex: 60,
      }}
    >
      <BlurView
        intensity={80}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />

      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const tab = TABS.find((t) => t.name === route.name) ?? TABS[index]!;
        const IconComponent = tab!.Icon;
        const label = tab!.label;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            LayoutAnimation.configureNext({
              duration: 250,
              update: { type: LayoutAnimation.Types.easeInEaseOut },
            });
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{
              height: 42,
              borderRadius: 999,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: isFocused ? 15 : 13,
              gap: isFocused ? 8 : 0,
              backgroundColor: isFocused
                ? (isDark ? "rgba(255,255,255,0.09)" : "rgba(11,11,18,0.06)")
                : "transparent",
            }}
          >
            <IconComponent
              color={isFocused ? colors.ink : colors.inkFaint}
              size={18}
              strokeWidth={1.7}
            />
            {isFocused && (
              <AppText
                numberOfLines={1}
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  letterSpacing: -0.1,
                  color: colors.ink,
                }}
              >
                {label}
              </AppText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="learn" options={{ title: "Learn" }} />
      <Tabs.Screen name="schedule" options={{ title: "Schedule" }} />
      <Tabs.Screen name="stats" options={{ title: "Stats" }} />
      <Tabs.Screen name="menu" options={{ title: "More" }} />
    </Tabs>
  );
}
