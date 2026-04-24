import { ActivityIndicator, View, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from "react-native";
import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import {
  BarChart3,
  CalendarDays,
  GraduationCap,
  LayoutGrid,
  Menu,
} from "lucide-react-native";

import { useAuth } from "~/lib/auth/auth-provider";
import { useTheme } from "~/lib/theme/use-theme";
import { AppText } from "~/components/ui/AppText";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={{
        position: "absolute",
        bottom: 24,
        alignSelf: "center",
        width: 328,
        height: 60,
        borderRadius: 30, 
        backgroundColor: isDark ? "rgba(24, 24, 27, 0.85)" : "rgba(255, 255, 255, 0.9)",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 8, 
        overflow: "hidden",
      }}
    >
      <BlurView
        intensity={80}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Sliding Background Bubble */}
      <View
        style={{
          position: "absolute",
          top: 8, 
          left: 8 + state.index * 52,
          width: 104, 
          height: 44,
          borderRadius: 22,
          backgroundColor: isDark ? "rgba(255, 255, 255, 0.15)" : colors.primaryLight || "rgba(99, 102, 241, 0.15)",
        }}
      />

      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const label = options.title !== undefined ? options.title : route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            LayoutAnimation.configureNext({
              duration: 250,
              update: {
                type: LayoutAnimation.Types.easeInEaseOut,
              },
            });
            navigation.navigate(route.name);
          }
        };

        const IconComponent =
          route.name === "index"
            ? LayoutGrid
            : route.name === "learn"
              ? GraduationCap
              : route.name === "schedule"
                ? CalendarDays
                : route.name === "stats"
                  ? BarChart3
                  : Menu;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{
              flex: isFocused ? 2 : 1, 
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <View
              style={{
                flexDirection: "row", 
                alignItems: "center",
                justifyContent: "center",
                height: 44,
                width: isFocused ? 104 : 44, 
                borderRadius: 22, 
                backgroundColor: "transparent",
                gap: isFocused ? 8 : 0, 
                overflow: "hidden", 
              }}
            >
              <IconComponent
                color={isFocused ? (isDark ? "#FFFFFF" : colors.primary) : colors.inkSoft}
                size={20} 
                strokeWidth={2} 
              />
              {isFocused && (
                <AppText
                  numberOfLines={1}
                  style={{
                    fontSize: 12, 
                    fontWeight: "600",
                    color: isDark ? "#FFFFFF" : colors.primary,
                  }}
                >
                  {label}
                </AppText>
              )}
            </View>
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
      <View style={styles.center}>
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

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
