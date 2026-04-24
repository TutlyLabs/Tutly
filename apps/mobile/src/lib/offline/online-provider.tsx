import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

type OnlineContextValue = {
  isOnline: boolean;
  isInternetReachable: boolean | null;
};

const OnlineContext = createContext<OnlineContextValue>({
  isOnline: true,
  isInternetReachable: true,
});

export function OnlineProvider({ children }: PropsWithChildren) {
  const [isOnline, setIsOnline] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<
    boolean | null
  >(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const reachable = state.isInternetReachable;
      setIsInternetReachable(reachable);
      setIsOnline(Boolean(state.isConnected && reachable !== false));
    });

    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({ isOnline, isInternetReachable }),
    [isInternetReachable, isOnline],
  );

  return (
    <OnlineContext.Provider value={value}>{children}</OnlineContext.Provider>
  );
}

export function useOnlineStatus() {
  return useContext(OnlineContext);
}
