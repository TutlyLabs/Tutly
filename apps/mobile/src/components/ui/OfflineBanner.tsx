import { View } from "react-native";
import { WifiOff } from "lucide-react-native";

import { useOnlineStatus } from "~/lib/offline/online-provider";
import { useTheme } from "~/lib/theme/use-theme";
import { AppText } from "./AppText";

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const { colors } = useTheme();

  if (isOnline) return null;

  return (
    <View className="flex-row items-center justify-center gap-sm px-lg py-xs" style={{ backgroundColor: colors.ink }}>
      <WifiOff color={colors.canvas} size={13} />
      <AppText variant="caption" style={{ color: colors.canvas }}>
        You're offline
      </AppText>
    </View>
  );
}
