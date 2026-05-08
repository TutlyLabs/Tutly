"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
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
import { formatBytes } from "@tutly/utils";

import { isNative } from "@/lib/native";
import {
  downloadVideo,
  getOfflineVideo,
  removeOfflineVideo,
  type OfflineVideoMeta,
} from "@/lib/offline-video";

interface Props {
  videoId: string;
  playlistUrl: string;
  title: string;
  classId?: string;
  courseId?: string;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
}

export function OfflineDownloadButton({
  videoId,
  playlistUrl,
  title,
  classId,
  courseId,
  thumbnailUrl,
  durationSec,
}: Props) {
  const [native, setNative] = useState(false);
  const [meta, setMeta] = useState<OfflineVideoMeta | null>(null);
  const [phase, setPhase] = useState<"idle" | "downloading" | "ready">("idle");
  const [pct, setPct] = useState(0);
  const [bytes, setBytes] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isNative()) return;
    setNative(true);
    void (async () => {
      const m = await getOfflineVideo(videoId);
      if (m) {
        setMeta(m);
        setPhase("ready");
      }
    })();
  }, [videoId]);

  if (!native) return null;

  const startDownload = async () => {
    setPhase("downloading");
    setPct(0);
    setBytes(0);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const m = await downloadVideo(
        videoId,
        playlistUrl,
        (p) => {
          setPct(p.pct);
          setBytes(p.downloadedBytes);
        },
        {
          classTitle: title,
          ...(classId ? { classId } : {}),
          ...(courseId ? { courseId } : {}),
          ...(thumbnailUrl ? { thumbnailUrl } : {}),
          ...(durationSec ? { durationSec } : {}),
        },
        ac.signal,
      );
      setMeta(m);
      setPhase("ready");
      toast.success(`Downloaded "${title}" for offline viewing`);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setPhase("idle");
        return;
      }
      const msg = e instanceof Error ? e.message : "Download failed";
      toast.error(msg);
      setPhase("idle");
    }
  };

  const cancelDownload = () => {
    abortRef.current?.abort();
  };

  const doDelete = async () => {
    await removeOfflineVideo(videoId);
    setMeta(null);
    setPhase("idle");
    setPct(0);
    setBytes(0);
    setConfirmDelete(false);
    toast.success("Removed offline copy");
  };

  if (phase === "downloading") {
    return (
      <button
        type="button"
        onClick={cancelDownload}
        className="bg-background/90 text-foreground inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium shadow-sm backdrop-blur"
        title="Cancel download"
      >
        <Loader2 className="text-primary h-3.5 w-3.5 animate-spin" />
        {pct}%
        <span className="text-muted-foreground hidden sm:inline">
          · {formatBytes(bytes)}
        </span>
        <X className="text-muted-foreground hover:text-destructive h-3.5 w-3.5" />
      </button>
    );
  }

  if (phase === "ready" && meta) {
    return (
      <>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400 inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-500/30 px-2.5 text-xs font-medium shadow-sm backdrop-blur"
          title="Available offline · click to remove"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Saved
          <span className="hidden sm:inline">· {formatBytes(meta.totalBytes)}</span>
        </button>
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove offline copy?</AlertDialogTitle>
              <AlertDialogDescription>
                This will free up {formatBytes(meta.totalBytes)} on your device. You can
                re-download anytime.
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
    <button
      type="button"
      onClick={startDownload}
      className="bg-background/80 text-foreground hover:bg-background inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium shadow-sm backdrop-blur"
      title="Save for offline viewing"
    >
      <Download className="h-3.5 w-3.5" />
      Save offline
    </button>
  );
}
