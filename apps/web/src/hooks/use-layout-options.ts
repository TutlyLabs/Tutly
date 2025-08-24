import { useEffect } from "react";
import { useLayout } from "@/providers/layout-provider";

interface UseLayoutOptionsProps {
  hideHeader?: boolean;
  hideCrisp?: boolean;
  className?: string;
  forceClose?: boolean;
}

export function useLayoutOptions({
  hideHeader = false,
  hideCrisp = false,
  className,
  forceClose = false,
}: UseLayoutOptionsProps = {}) {
  const {
    setHideHeader,
    setHideCrisp,
    setClassName,
    setForceClose,
    resetLayout,
  } = useLayout();

  useEffect(() => {
    setHideHeader(hideHeader);
    setHideCrisp(hideCrisp);
    setClassName(className);
    setForceClose(forceClose);

    return () => {
      resetLayout();
    };
  }, [
    hideHeader,
    hideCrisp,
    className,
    forceClose,
    setHideHeader,
    setHideCrisp,
    setClassName,
    setForceClose,
    resetLayout,
  ]);

  return {
    resetLayout,
  };
}
