"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
  Pause,
  Play,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@tutly/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@tutly/ui/dialog";
import { Button } from "@tutly/ui/button";
import { cn, formatBytes, formatDurationSeconds } from "@tutly/utils";

import { isNative } from "@/lib/native";
import {
  downloadVideo,
  getOfflineVideo,
  getPendingDownload,
  listVariants,
  removeOfflineVideo,
  type DownloadProgress,
  type OfflineVideoMeta,
  type VariantInfo,
} from "@/lib/offline-video";

interface Props {
  videoId: string;
  playlistUrl: string;
  title: string;
  classId?: string;
  courseId?: string;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  viewerLabel?: string;
}

type Phase = "idle" | "downloading" | "paused" | "ready";

function estimateBytes(
  bandwidth: number,
  durationSec: number | null,
): number | null {
  if (!durationSec || !bandwidth) return null;
  // bandwidth is bits per second; convert to bytes for total estimate.
  return Math.round((bandwidth / 8) * durationSec);
}

export function OfflineDownloadButton({
  videoId,
  playlistUrl,
  title,
  classId,
  courseId,
  thumbnailUrl,
  durationSec,
  viewerLabel,
}: Props) {
  const [native, setNative] = useState(false);
  const [meta, setMeta] = useState<OfflineVideoMeta | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Variant picker state.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [variants, setVariants] = useState<VariantInfo[] | null>(null);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [chosenRendition, setChosenRendition] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const pendingResumeRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isNative()) return;
    setNative(true);
    void (async () => {
      const m = await getOfflineVideo(videoId);
      if (m) {
        setMeta(m);
        setPhase("ready");
        return;
      }
      const pending = await getPendingDownload(videoId);
      if (pending) {
        // We left a partial download behind; surface as paused so the user can resume.
        pendingResumeRef.current = true;
        setChosenRendition(pending.rendition);
        setPhase("paused");
      }
    })();
  }, [videoId]);

  if (!native) return null;

  const startDownload = async (rendition: string | null) => {
    setPhase("downloading");
    setProgress(null);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const m = await downloadVideo(
        videoId,
        playlistUrl,
        (p) => setProgress(p),
        {
          classTitle: title,
          ...(classId ? { classId } : {}),
          ...(courseId ? { courseId } : {}),
          ...(thumbnailUrl ? { thumbnailUrl } : {}),
          ...(durationSec ? { durationSec } : {}),
          ...(viewerLabel ? { viewerLabel } : {}),
          ...(rendition ? { rendition } : {}),
        },
        ac.signal,
      );
      setMeta(m);
      setPhase("ready");
      pendingResumeRef.current = false;
      toast.success(`Saved "${title}" for offline viewing`);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // User-initiated pause — keep state so we can resume.
        setPhase("paused");
        return;
      }
      const msg = e instanceof Error ? e.message : "Download failed";
      toast.error(msg);
      setPhase(pendingResumeRef.current ? "paused" : "idle");
    }
  };

  const openPicker = async () => {
    setPickerOpen(true);
    if (variants !== null) return;
    setVariantsLoading(true);
    try {
      const list = await listVariants(playlistUrl);
      setVariants(list);
      const preferred =
        list.find((v) => v.name === "720p") ??
        list.find((v) => v.name === "480p") ??
        list[0];
      setChosenRendition(preferred?.name ?? null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load qualities";
      toast.error(msg);
      setPickerOpen(false);
    } finally {
      setVariantsLoading(false);
    }
  };

  const confirmStart = () => {
    setPickerOpen(false);
    void startDownload(chosenRendition);
  };

  const pauseDownload = () => {
    abortRef.current?.abort();
  };

  const resumeDownload = () => {
    void startDownload(chosenRendition);
  };

  const cancelPending = async () => {
    abortRef.current?.abort();
    await removeOfflineVideo(videoId);
    pendingResumeRef.current = false;
    setProgress(null);
    setPhase("idle");
    toast.success("Cancelled");
  };

  const doDelete = async () => {
    await removeOfflineVideo(videoId);
    setMeta(null);
    setPhase("idle");
    setProgress(null);
    setConfirmDelete(false);
    toast.success("Removed offline copy");
  };

  if (phase === "downloading" || phase === "paused") {
    const pct = progress?.pct ?? 0;
    const bytes = progress?.downloadedBytes ?? 0;
    const total = progress?.estimatedTotalBytes ?? null;
    const eta = progress?.etaSec ?? null;
    return (
      <div className="bg-background/90 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
        {phase === "downloading" ? (
          <Loader2 className="text-primary h-3.5 w-3.5 animate-spin" />
        ) : (
          <Pause className="text-muted-foreground h-3.5 w-3.5" />
        )}
        <div className="flex min-w-[120px] flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold tabular-nums">{pct}%</span>
            <span className="text-muted-foreground tabular-nums">
              {total
                ? `${formatBytes(bytes)} / ~${formatBytes(total)}`
                : formatBytes(bytes)}
            </span>
          </div>
          <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 ease-out",
                phase === "downloading"
                  ? "bg-primary"
                  : "bg-muted-foreground/60",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          {phase === "downloading" && eta !== null ? (
            <span className="text-muted-foreground hidden text-[10px] tabular-nums sm:block">
              ~{formatDurationSeconds(eta)} left
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5">
          {phase === "downloading" ? (
            <button
              type="button"
              onClick={pauseDownload}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Pause download"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={resumeDownload}
              className="text-primary hover:text-primary p-1"
              aria-label="Resume download"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={cancelPending}
            className="text-muted-foreground hover:text-destructive p-1"
            aria-label="Cancel download"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (phase === "ready" && meta) {
    return (
      <>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 text-xs font-medium text-emerald-700 shadow-sm backdrop-blur hover:bg-emerald-500/25 dark:text-emerald-400"
          title="Available offline · click to remove"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Saved
          <span className="hidden sm:inline">
            · {formatBytes(meta.totalBytes)} · {meta.rendition}
          </span>
        </button>
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove offline copy?</AlertDialogTitle>
              <AlertDialogDescription>
                This will free up {formatBytes(meta.totalBytes)} on your device.
                You can re-download anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={doDelete} className="gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className="bg-background/80 text-foreground hover:bg-background inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium shadow-sm backdrop-blur"
        title="Save for offline viewing"
      >
        <Download className="h-3.5 w-3.5" />
        Save offline
      </button>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save for offline viewing</DialogTitle>
            <DialogDescription>
              Pick a quality. Higher resolutions look better but use more
              storage and bandwidth.
            </DialogDescription>
          </DialogHeader>

          {variantsLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading qualities…
            </div>
          ) : !variants || variants.length === 0 ? (
            <p className="text-muted-foreground py-3 text-sm">
              No qualities found for this video.
            </p>
          ) : (
            <ul className="divide-border bg-card divide-y rounded-lg border">
              {variants
                .slice()
                .sort((a, b) => (a.height ?? 0) - (b.height ?? 0))
                .map((v) => {
                  const est = estimateBytes(v.bandwidth, durationSec ?? null);
                  const selected = chosenRendition === v.name;
                  return (
                    <li key={v.uri}>
                      <button
                        type="button"
                        onClick={() => setChosenRendition(v.name)}
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors",
                          selected ? "bg-primary/10" : "hover:bg-muted/40",
                        )}
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <span
                            aria-hidden
                            className={cn(
                              "h-3 w-3 rounded-full border",
                              selected
                                ? "border-primary bg-primary"
                                : "border-muted-foreground/40",
                            )}
                          />
                          {v.name}
                          {v.width && v.height ? (
                            <span className="text-muted-foreground font-mono text-[11px]">
                              {v.width}×{v.height}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                          {est
                            ? `~${formatBytes(est)}`
                            : `~${Math.round(v.bandwidth / 1000)} kbps`}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPickerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={confirmStart}
              disabled={variantsLoading || !chosenRendition}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Start download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
