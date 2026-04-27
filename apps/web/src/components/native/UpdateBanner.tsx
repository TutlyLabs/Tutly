"use client";

import { useEffect, useState } from "react";
import { ArrowUpCircle, Sparkles } from "lucide-react";

import { Button } from "@tutly/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@tutly/ui/sheet";

import { getPlatform, isNative } from "@/lib/native";
import {
  APP_STORE_URL,
  LATEST_NATIVE_VERSION,
  MIN_SUPPORTED_NATIVE_VERSION,
  PLAY_STORE_URL,
  compareVersions,
  currentAppVersion,
} from "@/lib/native-version";

const DISMISS_KEY = "tutly:update-dismissed-version";

export default function UpdateBanner() {
  const [show, setShow] = useState(false);
  const [forced, setForced] = useState(false);
  const [storeUrl, setStoreUrl] = useState<string>(PLAY_STORE_URL);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isNative()) return;

    const platform = getPlatform();
    const url = platform === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
    setStoreUrl(url);

    const current = currentAppVersion();
    const isOutdated =
      compareVersions(current, LATEST_NATIVE_VERSION) < 0;
    const isUnsupported =
      compareVersions(current, MIN_SUPPORTED_NATIVE_VERSION) < 0;

    if (!isOutdated) return;

    const dismissed = window.localStorage.getItem(DISMISS_KEY);
    if (!isUnsupported && dismissed === LATEST_NATIVE_VERSION) return;

    setForced(isUnsupported);
    setShow(true);
  }, []);

  const handleUpdate = async () => {
    if (typeof window === "undefined") return;
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: storeUrl });
    } catch {
      window.open(storeUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleLater = () => {
    if (typeof window === "undefined") return;
    if (forced) return;
    window.localStorage.setItem(DISMISS_KEY, LATEST_NATIVE_VERSION);
    setShow(false);
  };

  return (
    <Sheet
      open={show}
      onOpenChange={(o) => {
        if (!o && forced) return;
        setShow(o);
      }}
    >
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-t p-0 sm:max-w-md sm:mx-auto"
      >
        <div className="flex flex-col items-center gap-4 px-5 pt-6 pb-5 text-center">
          <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl">
            {forced ? (
              <ArrowUpCircle className="h-7 w-7" />
            ) : (
              <Sparkles className="h-7 w-7" />
            )}
          </div>
          <SheetHeader className="space-y-1.5 p-0 text-center">
            <SheetTitle className="text-foreground text-lg sm:text-xl">
              {forced ? "Update required" : "A new version is available"}
            </SheetTitle>
            <SheetDescription className="text-muted-foreground text-sm">
              {forced
                ? "This version of Tutly is no longer supported. Please update to keep using the app."
                : "Get the latest improvements, fixes, and features in the newest Tutly release."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-2 flex w-full flex-col gap-2">
            <Button onClick={handleUpdate} className="h-11 w-full text-sm">
              Update now
            </Button>
            {!forced && (
              <Button
                variant="ghost"
                onClick={handleLater}
                className="text-muted-foreground hover:text-foreground h-10 w-full text-sm"
              >
                Maybe later
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
