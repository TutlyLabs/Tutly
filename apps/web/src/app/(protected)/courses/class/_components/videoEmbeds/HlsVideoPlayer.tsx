"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Clock,
  Loader2,
  Sparkles,
  Upload,
  WifiOff,
} from "lucide-react";

import {
  MediaPlayer,
  MediaProvider,
  Poster,
} from "@vidstack/react";
import {
  PlyrLayout,
  plyrLayoutIcons,
} from "@vidstack/react/player/layouts/plyr";

import "@vidstack/react/player/styles/plyr/theme.css";

import { cn, formatDurationSeconds } from "@tutly/utils";

import { api } from "@/trpc/react";
import { isNative } from "@/lib/native";
import {
  getOfflineVideo,
  type OfflineVideoMeta,
} from "@/lib/offline-video";
import { OfflineDownloadButton } from "@/components/OfflineDownloadButton";

type Status = "UPLOADING" | "PROCESSING" | "READY" | "FAILED";

interface HlsVideoPlayerProps {
  videoId: string;
  initialStatus: Status | null;
  initialPlaylistUrl: string | null;
  initialThumbnailUrl: string | null;
  initialDuration: number | null;
  classTitle?: string;
  classId?: string;
  courseId?: string;
  /** True for instructors/admins — shows "View runs" link in placeholders. */
  isStaff?: boolean;
}

export default function HlsVideoPlayer({
  videoId,
  initialStatus,
  initialPlaylistUrl,
  initialThumbnailUrl,
  initialDuration,
  classTitle,
  classId,
  courseId,
  isStaff = false,
}: HlsVideoPlayerProps) {
  const [offline, setOffline] = useState<OfflineVideoMeta | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const router = useRouter();
  const utils = api.useUtils();

  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!isNative()) return;
      const m = await getOfflineVideo(videoId);
      if (mounted) setOffline(m);

      const { Network } = await import("@capacitor/network");
      const status = await Network.getStatus();
      if (mounted) setIsOnline(status.connected);
      const handle = await Network.addListener("networkStatusChange", (s) => {
        if (mounted) setIsOnline(s.connected);
      });
      return () => handle.remove();
    })();
    return () => {
      mounted = false;
    };
  }, [videoId]);

  const status = initialStatus ?? "PROCESSING";
  const isTerminal = status === "READY" || status === "FAILED";

  const statusQuery = api.videos.getStatus.useQuery(
    { videoId },
    {
      refetchInterval: (q) => {
        const s = q.state.data?.status;
        return s === "READY" || s === "FAILED" ? false : 3000;
      },
      enabled: !isTerminal || !initialPlaylistUrl,
    },
  );

  const current = statusQuery.data;
  const liveStatus = current?.status ?? status;
  const playlistUrl = current?.hlsPlaylistUrl ?? initialPlaylistUrl;
  const thumbnailUrl = current?.thumbnailUrl ?? initialThumbnailUrl;
  const errorMessage = current?.errorMessage;
  // Worker throttles intermediate writes; snap to 100 once status is READY so
  // the bar doesn't strand mid-encoding before the player mounts.
  const progress = liveStatus === "READY" ? 100 : (current?.progress ?? 0);
  const progressStep = current?.progressStep ?? null;
  const startedAt = current?.processStartedAt ?? null;

  // Refresh the parent RSC so video.hlsPlaylistUrl is populated even if the
  // inline poll response is cached.
  const lastSeenStatus = useRef<Status | null>(null);
  useEffect(() => {
    const next = current?.status;
    if (!next) return;
    if (lastSeenStatus.current === next) return;
    lastSeenStatus.current = next;
    if (next === "READY" || next === "FAILED") {
      if (classId) void utils.classes.getClassDetails.invalidate({ id: classId });
      router.refresh();
    }
  }, [current?.status, classId, router, utils]);

  if (liveStatus === "UPLOADING") {
    return (
      <ProcessingCard
        accent="blue"
        icon={<Upload className="h-5 w-5" />}
        eyebrow="Uploading"
        title="Source video is still uploading"
        message="The instructor is uploading the source file. This page will update automatically."
        progress={null}
        step={null}
        startedAt={startedAt}
        thumbnailUrl={thumbnailUrl}
      />
    );
  }

  if (liveStatus === "PROCESSING" || (!playlistUrl && liveStatus !== "FAILED")) {
    return (
      <ProcessingCard
        accent="primary"
        icon={<Sparkles className="h-5 w-5" />}
        eyebrow={isStaff ? "Transcoding" : "Almost ready"}
        title={isStaff ? "Preparing your video" : "We're getting this video ready"}
        message={
          isStaff
            ? "Generating adaptive HLS at 480p · 720p · 1080p — typically 10–30 minutes for a full class."
            : "This page will refresh automatically when the video is ready to play."
        }
        progress={progress}
        // Hide the technical step name from students; show only to staff
        step={isStaff ? progressStep : null}
        // Hide elapsed time from students
        startedAt={isStaff ? startedAt : null}
        thumbnailUrl={thumbnailUrl}
        footer={
          isStaff ? (
            <Link
              href="/tutor/video-runs"
              className="text-muted-foreground hover:text-foreground text-[11px] font-medium underline-offset-2 hover:underline"
            >
              View all runs →
            </Link>
          ) : null
        }
      />
    );
  }

  if (liveStatus === "FAILED" || !playlistUrl) {
    return (
      <ProcessingCard
        accent="destructive"
        icon={<AlertCircle className="h-5 w-5" />}
        eyebrow="Processing failed"
        title="Couldn't prepare this video"
        message={
          errorMessage ??
          "Something went wrong while transcoding. The instructor has been notified."
        }
        progress={null}
        step={null}
        startedAt={startedAt}
        thumbnailUrl={thumbnailUrl}
        footer={
          isStaff ? (
            <Link
              href="/tutor/video-runs"
              className="text-foreground bg-card hover:bg-accent inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-sm transition-colors"
            >
              Open in Video Runs →
            </Link>
          ) : (
            <span className="text-muted-foreground text-[11px]">
              Try again later, or contact your instructor.
            </span>
          )
        }
      />
    );
  }

  // Prefer offline copy when on mobile + offline copy exists
  const useOffline = !!offline && (!isOnline || isNative());
  const sourceSrc = useOffline ? offline!.localPlaylistUri : playlistUrl;

  if (!isOnline && !offline) {
    return (
      <ProcessingCard
        accent="muted"
        icon={<WifiOff className="h-5 w-5" />}
        eyebrow="Offline"
        title="You're offline"
        message="This video isn't saved on your device. Reconnect, or save it offline next time you have internet."
        progress={null}
        step={null}
        startedAt={null}
        thumbnailUrl={thumbnailUrl}
      />
    );
  }

  return (
    <div
      className="relative h-full w-full"
      style={
        {
          // Bind Plyr accents to Tutly's theme primary so the player
          // controls feel native to the rest of the app.
          "--plyr-color-main": "var(--primary)",
          "--plyr-video-control-color": "rgba(255,255,255,0.92)",
          "--plyr-video-control-color-hover": "#ffffff",
          "--plyr-video-controls-background":
            "linear-gradient(to top, rgba(0,0,0,0.65), transparent)",
          "--plyr-video-progress-buffered-background": "rgba(255,255,255,0.25)",
          "--plyr-tooltip-background": "var(--popover, #18181b)",
          "--plyr-tooltip-color": "var(--popover-foreground, #fafafa)",
          "--plyr-menu-background": "rgba(20,20,22,0.92)",
          "--plyr-menu-color": "#ffffff",
          "--plyr-menu-radius": "10px",
          "--plyr-range-thumb-background": "var(--primary)",
        } as React.CSSProperties
      }
    >
      <MediaPlayer
        src={{ src: sourceSrc, type: "application/x-mpegurl" }}
        title={classTitle}
        crossOrigin={useOffline ? undefined : true}
        playsInline
        load="visible"
        streamType="on-demand"
        viewType="video"
        storage="tutly-player"
        className="h-full w-full"
      >
        <MediaProvider>
          {thumbnailUrl ? (
            <Poster className="vds-poster" src={thumbnailUrl} alt={classTitle ?? ""} />
          ) : null}
        </MediaProvider>
        <PlyrLayout icons={plyrLayoutIcons} />
      </MediaPlayer>

      <div className="absolute top-3 right-3 z-10">
        <OfflineDownloadButton
          videoId={videoId}
          playlistUrl={playlistUrl}
          title={classTitle ?? "class"}
          classId={classId}
          courseId={courseId}
          thumbnailUrl={thumbnailUrl}
          durationSec={current?.duration ?? initialDuration ?? null}
        />
      </div>
    </div>
  );
}

type Accent = "primary" | "blue" | "destructive" | "muted";

const ACCENT_BG: Record<Accent, string> = {
  primary: "bg-primary/10 text-primary",
  blue: "bg-blue-500/10 text-blue-500",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted/60 text-muted-foreground",
};

const ACCENT_BAR: Record<Accent, string> = {
  primary: "bg-primary",
  blue: "bg-blue-500",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
};

function ProcessingCard({
  accent,
  icon,
  eyebrow,
  title,
  message,
  progress,
  step,
  startedAt,
  thumbnailUrl,
  footer,
}: {
  accent: Accent;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  message: string;
  progress: number | null;
  step: string | null;
  startedAt: Date | string | null;
  thumbnailUrl: string | null;
  footer?: React.ReactNode;
}) {
  const ORB_BG: Record<Accent, string> = {
    primary: "bg-primary/15",
    blue: "bg-blue-500/15",
    destructive: "bg-destructive/15",
    muted: "bg-muted-foreground/10",
  };
  const ORB_BG_2: Record<Accent, string> = {
    primary: "bg-amber-500/10",
    blue: "bg-cyan-500/10",
    destructive: "bg-orange-500/10",
    muted: "bg-muted-foreground/5",
  };

  return (
    <div className="bg-card relative h-full w-full overflow-hidden">
      {/* Blurred poster behind for depth — only when we have a real thumbnail. */}
      {thumbnailUrl ? (
        <>
          <div
            className="absolute inset-0 scale-110 opacity-40 blur-2xl"
            style={{
              backgroundImage: `url(${thumbnailUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden
          />
          <div className="bg-background/65 absolute inset-0 backdrop-blur-md" />
        </>
      ) : (
        // No thumbnail yet — paint two soft accent orbs to give the card real
        // visual presence. Mirrors the hero-band treatment used elsewhere.
        <>
          <div
            className={cn(
              "pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl",
              ORB_BG[accent],
            )}
            aria-hidden
          />
          <div
            className={cn(
              "pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full blur-3xl",
              ORB_BG_2[accent],
            )}
            aria-hidden
          />
        </>
      )}

      <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
        {/* Icon disc */}
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm",
            ACCENT_BG[accent],
          )}
        >
          {icon}
        </div>

        {/* Eyebrow + title + message */}
        <div className="max-w-md">
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.14em]",
              ACCENT_BG[accent].split(" ")[1],
            )}
          >
            {eyebrow}
          </p>
          <h3 className="text-foreground mt-1 text-base font-semibold sm:text-lg">
            {title}
          </h3>
          <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed sm:text-[13px]">
            {message}
          </p>
        </div>

        {/* Progress bar (only when we actually have a number) */}
        {progress !== null && (
          <div className="w-full max-w-sm">
            <div className="bg-muted/70 relative h-1.5 w-full overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-700 ease-out",
                  ACCENT_BAR[accent],
                )}
                style={{ width: `${progress}%` }}
              />
              {progress < 100 && (
                <div
                  className="absolute inset-y-0 w-12 -translate-x-full rounded-full bg-white/10 mix-blend-overlay"
                  style={{
                    animation: "shimmer 2.2s linear infinite",
                  }}
                  aria-hidden
                />
              )}
            </div>

            <div className="text-muted-foreground mt-2 flex items-center justify-between font-mono text-[11px]">
              <span>{step ?? "Preparing…"}</span>
              <span className="tabular-nums">
                {progress < 100 ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : null}
                {progress}%
              </span>
            </div>
          </div>
        )}

        {startedAt && (
          <p className="text-muted-foreground inline-flex items-center gap-1.5 font-mono text-[11px]">
            <Clock className="h-3 w-3" />
            <ElapsedSince date={startedAt} />
          </p>
        )}

        {footer ? <div className="mt-1">{footer}</div> : null}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(900%);
          }
        }
      `}</style>
    </div>
  );
}

function ElapsedSince({ date }: { date: Date | string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const startMs =
    typeof date === "string" ? new Date(date).getTime() : date.getTime();
  const elapsed = Math.max(0, Math.floor((now - startMs) / 1000));
  return <span>elapsed {formatDurationSeconds(elapsed)}</span>;
}
