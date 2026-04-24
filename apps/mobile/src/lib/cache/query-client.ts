import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { onlineManager, QueryClient } from "@tanstack/react-query";

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(
      Boolean(state.isConnected && state.isInternetReachable !== false),
    );
  }),
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 10,
      networkMode: "offlineFirst",
      retry: 1,
      staleTime: 1000 * 60 * 3,
    },
    mutations: {
      networkMode: "online",
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "tutly-mobile-query-cache",
  throttleTime: 1000,
});
