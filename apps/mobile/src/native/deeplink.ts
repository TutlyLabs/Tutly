import { App } from "@capacitor/app";
import type { NavigateFunction } from "react-router-dom";

/**
 * `tutly://courses/abc` → navigates to `/courses/abc` inside the SPA.
 * Called once at app boot from `App.tsx` after `useNavigate()` is available.
 */
export function registerDeepLinkHandler(navigate: NavigateFunction) {
  return App.addListener("appUrlOpen", (event) => {
    try {
      const url = new URL(event.url);
      const path = `${url.pathname}${url.search}${url.hash}` || "/";
      navigate(path);
    } catch {
      // Ignore malformed deep links rather than crashing the app.
    }
  });
}
