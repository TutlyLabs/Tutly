"use client";

import { createContext, useContext } from "react";

interface FeatureFlags {
  isGoogleSignInEnabled: boolean;
  isGithubSignInEnabled: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlags>({
  isGoogleSignInEnabled: false,
  isGithubSignInEnabled: false,
});

export const useFeatureFlags = () => useContext(FeatureFlagsContext);

interface FeatureFlagsProviderProps {
  children: React.ReactNode;
  isGoogleSignInEnabled: boolean;
  isGithubSignInEnabled: boolean;
}

export function FeatureFlagsProvider({
  children,
  isGoogleSignInEnabled,
  isGithubSignInEnabled,
}: FeatureFlagsProviderProps) {
  return (
    <FeatureFlagsContext.Provider
      value={{
        isGoogleSignInEnabled,
        isGithubSignInEnabled,
      }}
    >
      {children}
    </FeatureFlagsContext.Provider>
  );
}
