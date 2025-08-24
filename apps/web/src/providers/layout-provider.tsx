"use client";

import * as React from "react";

interface LayoutContextType {
  hideHeader: boolean;
  hideCrisp: boolean;
  className?: string;
  forceClose: boolean;
  setHideHeader: (hide: boolean) => void;
  setHideCrisp: (hide: boolean) => void;
  setClassName: (className?: string) => void;
  setForceClose: (forceClose: boolean) => void;
  resetLayout: () => void;
}

const LayoutContext = React.createContext<LayoutContextType | undefined>(
  undefined,
);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [hideHeader, setHideHeader] = React.useState(false);
  const [hideCrisp, setHideCrisp] = React.useState(false);
  const [className, setClassName] = React.useState<string | undefined>(
    undefined,
  );
  const [forceClose, setForceClose] = React.useState(false);

  const resetLayout = React.useCallback(() => {
    setHideHeader(false);
    setHideCrisp(false);
    setClassName(undefined);
    setForceClose(false);
  }, []);

  const value = React.useMemo(
    () => ({
      hideHeader,
      hideCrisp,
      className,
      forceClose,
      setHideHeader,
      setHideCrisp,
      setClassName,
      setForceClose,
      resetLayout,
    }),
    [hideHeader, hideCrisp, className, forceClose, resetLayout],
  );

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = React.useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
