import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { AppText } from "~/components/ui/AppText";
import { useAuth } from "~/lib/auth/auth-provider";
import { useTheme } from "~/lib/theme/use-theme";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center gap-[12px]" style={{ backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.primary} />
        <AppText muted variant="caption">
          Loading Tutly
        </AppText>
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? "/(tabs)" : "/(auth)/sign-in"} />;
}
