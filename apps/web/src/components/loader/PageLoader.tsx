"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function PageLoader() {
  const loaderRef = useRef<HTMLDivElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const elementsWithAttachedHandlers = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader) return;

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    loadingTimeoutRef.current = setTimeout(() => {
      loader.classList.remove("loading");
    }, 100);
  }, [pathname, searchParams]);

  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader) return;

    if (document.readyState === "complete") {
      loader.classList.remove("loading");
    } else {
      const handleLoad = () => {
        loader.classList.remove("loading");
      };
      window.addEventListener("load", handleLoad);
      return () => window.removeEventListener("load", handleLoad);
    }
  }, []);

  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader) return;

    let timer: NodeJS.Timeout;

    const startProgress = () => {
      timer = setTimeout(() => {
        loader.classList.add("loading");
      }, 50);
    };

    const stopProgress = () => {
      if (timer) {
        clearTimeout(timer);
      }
    };

    const handleAnchorClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;

      const target = event.target as HTMLElement;
      const anchorElement = event.currentTarget as HTMLAnchorElement;

      const preventProgress =
        target?.getAttribute("data-prevent-page-loader") === "true" ||
        anchorElement?.getAttribute("data-prevent-page-loader") === "true";

      if (preventProgress) return;

      if (anchorElement.target === "_blank") return;

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;

      const href = anchorElement.href;
      if (!href) return;

      try {
        const targetUrl = new URL(href);
        const currentUrl = new URL(location.href);

        if (
          targetUrl.pathname === currentUrl.pathname &&
          targetUrl.search === currentUrl.search
        ) {
          return;
        }

        if (targetUrl.origin !== currentUrl.origin) return;

        if (
          href.startsWith("tel:") ||
          href.startsWith("mailto:") ||
          href.startsWith("blob:") ||
          href.startsWith("javascript:")
        ) {
          return;
        }

        startProgress();
      } catch (error) {
        return;
      }
    };

    const handleMutation = () => {
      const anchorElements = Array.from(document.querySelectorAll("a"));

      const validAnchorElements = anchorElements.filter((anchor) => {
        const href = anchor.href;
        const isPageLoaderDisabled =
          anchor.getAttribute("data-disable-page-loader") === "true";
        const isNotSpecialProtocol =
          href &&
          !href.startsWith("tel:") &&
          !href.startsWith("mailto:") &&
          !href.startsWith("blob:") &&
          !href.startsWith("javascript:");

        return (
          !isPageLoaderDisabled &&
          isNotSpecialProtocol &&
          anchor.target !== "_blank"
        );
      });

      validAnchorElements.forEach((anchor) => {
        anchor.addEventListener("click", handleAnchorClick, true);
      });

      elementsWithAttachedHandlers.current = validAnchorElements;
    };

    const mutationObserver = new MutationObserver(handleMutation);
    mutationObserver.observe(document, { childList: true, subtree: true });

    handleMutation();

    return () => {
      mutationObserver.disconnect();
      elementsWithAttachedHandlers.current.forEach((anchor) => {
        anchor.removeEventListener("click", handleAnchorClick, true);
      });
      elementsWithAttachedHandlers.current = [];
      stopProgress();
    };
  }, []);

  return (
    <>
      <div ref={loaderRef} className="loader">
        <div className="loader-bar"></div>
        <div className="loader-shimmer"></div>
      </div>
      <style jsx>{`
        .loader {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 9999;
          width: 100%;
          height: 3px;
          pointer-events: none;
        }

        .loader-bar {
          position: absolute;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            hsl(221.2 83.2% 53.3%) 50%,
            transparent 100%
          );
          transform: translateX(-100%);
          animation: none;
        }

        .loader-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          transform: translateX(-100%);
          animation: none;
        }

        .loader.loading .loader-bar {
          animation: loading-bar 1s ease-in-out infinite;
        }

        .loader.loading .loader-shimmer {
          animation: loading-shimmer 1s ease-in-out infinite;
        }

        @keyframes loading-bar {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes loading-shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </>
  );
}
