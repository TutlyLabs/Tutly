import "../global.css";
import { StatusBar } from "react-native";
import { Stack } from "expo-router";

import { AppProviders } from "~/lib/providers";
import { useTheme } from "~/lib/theme/use-theme";

function RootNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.canvas },
          headerShown: false,
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
