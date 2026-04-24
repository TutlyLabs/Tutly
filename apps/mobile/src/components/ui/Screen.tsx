import type { PropsWithChildren } from "react";
import type { ScrollViewProps } from "react-native";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { spacing } from "~/lib/theme/tokens";
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
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
        <OfflineBanner />
        <View
          style={[
            styles.contentBase,
            styles.staticContent,
            contentContainerStyle,
            style,
          ]}
        >
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <OfflineBanner />
      <ScrollView
        {...props}
        showsVerticalScrollIndicator={false}
        style={[styles.scroll, style]}
        contentContainerStyle={[
          styles.contentBase,
          styles.scrollContent,
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  contentBase: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  scrollContent: {
    paddingBottom: spacing.xxl + 80,
  },
  staticContent: {
    flex: 1,
    paddingBottom: spacing.xxl,
  },
});
