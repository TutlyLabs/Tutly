import type { PropsWithChildren } from "react";
import type { ScrollViewProps } from "react-native";
import { RefreshControl, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "~/lib/theme/use-theme";
import { OfflineBanner } from "./OfflineBanner";

type ScreenProps = PropsWithChildren<
  ScrollViewProps & {
    scroll?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    hideGlow?: boolean;
  }
>;

/**
 * Ambient accent glow using a single large LinearGradient
 * positioned diagonally from top-right, fading to transparent.
 * This avoids the visible-circle problem of layered Views.
 */
function AmbientGlow() {
  const { colors, isDark } = useTheme();
  const accent = colors.primary;

  return (
    <View
      style={{
        position: "absolute",
        top: -80,
        right: -60,
        width: 350,
        height: 350,
        borderRadius: 175,
        overflow: "hidden",
        zIndex: 0,
      }}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[
          isDark ? `${accent}30` : `${accent}18`,
          isDark ? `${accent}12` : `${accent}08`,
          "transparent",
        ]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ flex: 1 }}
      />
    </View>
  );
}

export function Screen({
  children,
  style,
  contentContainerStyle,
  scroll = true,
  refreshing = false,
  onRefresh,
  hideGlow = false,
  ...props
}: ScreenProps) {
  const { colors } = useTheme();

  if (!scroll) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.canvas }}>
        <OfflineBanner />
        {!hideGlow && <AmbientGlow />}
        <View
          className="flex-1 gap-md px-lg pt-sm pb-xxl"
          style={[contentContainerStyle, style, { zIndex: 1 }]}
        >
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <OfflineBanner />
      {!hideGlow && <AmbientGlow />}
      <ScrollView
        {...props}
        showsVerticalScrollIndicator={false}
        className="flex-1"
        style={[style, { zIndex: 1 }]}
        contentContainerStyle={[
          { gap: 16, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 },
          contentContainerStyle,
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
