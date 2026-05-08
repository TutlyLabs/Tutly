"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";

import {
  MediaPlayer,
  MediaProvider,
} from "@vidstack/react";
import {
  PlyrLayout,
  plyrLayoutIcons,
} from "@vidstack/react/player/layouts/plyr";

import "@vidstack/react/player/styles/plyr/theme.css";

import { Button } from "@tutly/ui/button";

import { getOfflineVideo, type OfflineVideoMeta } from "@/lib/offline-video";

export default function OfflinePlayerPage() {
  const router = useRouter();
  const params = useSearchParams();
  const videoId = params.get("videoId");

  const [meta, setMeta] = useState<OfflineVideoMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId) {
      setError("No video ID provided");
      return;
    }
    void (async () => {
      const m = await getOfflineVideo(videoId);
      if (!m) {
        setError("This video isn't saved on this device.");
        return;
      }
      setMeta(m);
    })();
  }, [videoId]);

  return (
    <div className="bg-background flex h-full min-h-[calc(100vh-3rem)] flex-col">
      <div className="bg-card flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-foreground text-sm font-medium">Offline playback</h1>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        {error ? (
          <div className="bg-card flex max-w-md flex-col items-center gap-3 rounded-xl border p-6 text-center">
            <AlertCircle className="text-destructive h-6 w-6" />
            <p className="text-foreground text-sm font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              Go back
            </Button>
          </div>
        ) : !meta ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : (
          <div
            className="aspect-video w-full max-w-5xl overflow-hidden rounded-xl bg-black shadow-lg"
            style={
              {
                "--plyr-color-main": "var(--primary)",
                "--plyr-video-control-color": "rgba(255,255,255,0.92)",
                "--plyr-range-thumb-background": "var(--primary)",
              } as React.CSSProperties
            }
          >
            <MediaPlayer
              src={{
                src: meta.localPlaylistUri,
                type: "application/x-mpegurl",
              }}
              playsInline
              load="visible"
              streamType="on-demand"
              viewType="video"
              storage={`tutly-offline-${meta.videoId}`}
              className="h-full w-full"
            >
              <MediaProvider />
              <PlyrLayout icons={plyrLayoutIcons} />
            </MediaPlayer>
          </div>
        )}
      </div>
    </div>
  );
}
