"use client";

import { useEffect, useRef } from "react";

export default function PageLoader() {
  const loaderRef = useRef<HTMLDivElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader) return;

    const handleRouteChangeStart = () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      loader.classList.add("loading");
    };

    const handleRouteChangeComplete = () => {
      const startTime = performance.now();
      const loadTime = performance.now() - startTime;
      const remainingTime = Math.max(0, 400 - loadTime);

      loadingTimeoutRef.current = setTimeout(() => {
        loader.classList.remove("loading");
      }, remainingTime);
    };

    window.addEventListener("beforeunload", handleRouteChangeStart);
    window.addEventListener("load", handleRouteChangeComplete);

    return () => {
      window.removeEventListener("beforeunload", handleRouteChangeStart);
      window.removeEventListener("load", handleRouteChangeComplete);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
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
