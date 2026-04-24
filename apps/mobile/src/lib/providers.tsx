import type { PropsWithChildren } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { AuthProvider } from "./auth/auth-provider";
import { asyncStoragePersister, queryClient } from "./cache/query-client";
import { OnlineProvider } from "./offline/online-provider";
import { ThemeProvider } from "./theme/use-theme";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <OnlineProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
              maxAge: 1000 * 60 * 60 * 24 * 7,
              persister: asyncStoragePersister,
            }}
          >
            <ThemeProvider>
              <AuthProvider>{children}</AuthProvider>
            </ThemeProvider>
          </PersistQueryClientProvider>
        </OnlineProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
