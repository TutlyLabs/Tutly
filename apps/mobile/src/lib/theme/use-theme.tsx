import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { colors, darkColors } from "./tokens";

type ThemeMode = "light" | "dark" | "system";

type ThemeContextType = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: Record<keyof typeof colors, string>;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("dark"); // default to dark
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("tutly-theme").then((savedMode) => {
      if (savedMode === "light" || savedMode === "dark" || savedMode === "system") {
        setModeState(savedMode);
      }
      setMounted(true);
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    void AsyncStorage.setItem("tutly-theme", newMode);
  };

  const isDark =
    mode === "dark" || (mode === "system" && systemScheme === "dark");
  const palette = isDark ? darkColors : colors;

  // Render children even if not mounted yet, default is dark anyway
  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark, colors: palette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context) return context;
  // Fallback for missing provider
  return {
    mode: "dark" as ThemeMode,
    setMode: () => {},
    isDark: true,
    colors: darkColors,
  };
}
