import { StyleSheet, View } from "react-native";
import { WifiOff } from "lucide-react-native";

import { useOnlineStatus } from "~/lib/offline/online-provider";
import { spacing } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";
import { AppText } from "./AppText";

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const { colors } = useTheme();

  if (isOnline) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.ink,
        },
      ]}
    >
      <WifiOff color={colors.canvas} size={13} />
      <AppText variant="caption" style={{ color: colors.canvas }}>
        You're offline
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
});
