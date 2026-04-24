import type { PropsWithChildren } from "react";
import type { ScrollViewProps } from "react-native";
import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "~/lib/theme/use-theme";
import { OfflineBanner } from "./OfflineBanner";

type ScreenProps = PropsWithChildren<
  ScrollViewProps & {
    scroll?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
  }
>;

export function Screen({
  children,
  style,
  contentContainerStyle,
  scroll = true,
  refreshing = false,
  onRefresh,
  ...props
}: ScreenProps) {
  const { colors } = useTheme();

  if (!scroll) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.canvas }}>
        <OfflineBanner />
        <View
          className="flex-1 gap-md px-lg pt-sm pb-xxl"
          style={[contentContainerStyle, style]}
        >
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.canvas }}>
      <OfflineBanner />
      <ScrollView
        {...props}
        showsVerticalScrollIndicator={false}
        className="flex-1"
        style={style}
        contentContainerStyle={[
          { gap: 16, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 120 },
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
