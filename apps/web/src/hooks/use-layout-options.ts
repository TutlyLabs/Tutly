import { useEffect } from "react";
import { useLayout } from "@/providers/layout-provider";

interface UseLayoutOptionsProps {
  hideHeader?: boolean;
  hideCrisp?: boolean;
  hideSidebar?: boolean;
  className?: string;
  forceClose?: boolean;
}

export function useLayoutOptions({
  hideHeader = false,
  hideCrisp = false,
  hideSidebar = false,
  className,
  forceClose = false,
}: UseLayoutOptionsProps = {}) {
  const {
    setHideHeader,
    setHideCrisp,
    setHideSidebar,
    setClassName,
    setForceClose,
    resetLayout,
  } = useLayout();

  useEffect(() => {
    setHideHeader(hideHeader);
    setHideCrisp(hideCrisp);
    setHideSidebar(hideSidebar);
    setClassName(className);
    setForceClose(forceClose);

    return () => {
      resetLayout();
    };
  }, [
    hideHeader,
    hideCrisp,
    hideSidebar,
    className,
    forceClose,
    setHideHeader,
    setHideCrisp,
    setHideSidebar,
    setClassName,
    setForceClose,
    resetLayout,
  ]);

  return {
    resetLayout,
  };
}
