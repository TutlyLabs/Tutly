"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  FileVideo,
  Loader2,
  Sparkles,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@tutly/ui/button";
import { cn, formatBytes, formatDurationSeconds } from "@tutly/utils";

import { api } from "@/trpc/react";

const ALLOWED_MIMES = [
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
];
const MAX_BYTES = 5 * 1024 * 1024 * 1024;

type Phase =
  | "idle"
  | "probing"
  | "uploading"
  | "finalizing"
  | "ready"
  | "error";

interface FileMeta {
  durationSec: number | null;
  posterDataUrl: string | null;
  width: number | null;
  height: number | null;
}

async function probeFile(file: File): Promise<FileMeta> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);
    const fail = () => {
      cleanup();
      resolve({
        durationSec: null,
        posterDataUrl: null,
        width: null,
        height: null,
      });
    };

    video.onloadedmetadata = () => {
      const dur = Number.isFinite(video.duration) ? video.duration : null;
      const w = video.videoWidth || null;
      const h = video.videoHeight || null;
      // Seek to ~1s for a poster frame
      const seekTo = dur && dur > 1.5 ? 1 : 0;
      video.currentTime = seekTo;
      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          const maxW = 480;
          const ratio = w && h ? Math.min(1, maxW / w) : 1;
          canvas.width = w ? Math.round(w * ratio) : 480;
          canvas.height = h ? Math.round(h * ratio) : 270;
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const data = canvas.toDataURL("image/jpeg", 0.82);
          cleanup();
          resolve({
            durationSec: dur,
            posterDataUrl: data,
            width: w,
            height: h,
          });
        } catch {
          cleanup();
          resolve({
            durationSec: dur,
            posterDataUrl: null,
            width: w,
            height: h,
          });
        }
      };
    };
    video.onerror = fail;
    setTimeout(fail, 8000); // hard timeout
  });
}

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (loaded: number, total: number, bytesPerSec: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let lastTs = Date.now();
    let lastLoaded = 0;
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const now = Date.now();
      const dt = (now - lastTs) / 1000;
      const dBytes = e.loaded - lastLoaded;
      // Smoothed bps using EMA over short windows for less jitter
      const inst = dt > 0 ? dBytes / dt : 0;
      lastTs = now;
      lastLoaded = e.loaded;
      onProgress(e.loaded, e.total, inst);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () =>
      reject(new DOMException("Upload aborted", "AbortError"));
    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort());
    }
    xhr.send(file);
  });
}

interface VideoUploadProps {
  videoId: string | null;
  onUploaded: (videoId: string) => void;
  onCleared: () => void;
  /** Fires when upload activity starts/stops so parents can guard navigation. */
  onActiveChange?: (active: boolean) => void;
}

export function VideoUpload({
  videoId: _videoId,
  onUploaded,
  onCleared,
  onActiveChange,
}: VideoUploadProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [loaded, setLoaded] = useState(0);
  const [bpsSmoothed, setBpsSmoothed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [internalVideoId, setInternalVideoId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const requestUpload = api.videos.requestUpload.useMutation();
  const uploadComplete = api.videos.uploadComplete.useMutation();
  const abandon = api.videos.abandon.useMutation();

  // Notify parent when an upload is in flight + warn on tab close
  useEffect(() => {
    const active =
      phase === "probing" || phase === "uploading" || phase === "finalizing";
    onActiveChange?.(active);
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase, onActiveChange]);

  const handleFile = useCallback(
    async (picked: File) => {
      setError(null);
      if (!ALLOWED_MIMES.includes(picked.type)) {
        setError(`Unsupported video type: ${picked.type || "unknown"}`);
        return;
      }
      if (picked.size > MAX_BYTES) {
        setError(`File too large (max ${formatBytes(MAX_BYTES)})`);
        return;
      }
      setFile(picked);
      setMeta(null);
      setPhase("probing");
      setLoaded(0);
      setBpsSmoothed(0);

      // Probe duration + poster in parallel with the request-upload call
      const probePromise = probeFile(picked);

      try {
        const [{ videoId: newVideoId, uploadUrl }, fileMeta] =
          await Promise.all([
            requestUpload.mutateAsync({
              fileName: picked.name,
              fileSize: picked.size,
              mimeType: picked.type,
            }),
            probePromise,
          ]);

        setMeta(fileMeta);
        setInternalVideoId(newVideoId);
        setPhase("uploading");

        const ac = new AbortController();
        abortRef.current = ac;
        await uploadWithProgress(
          uploadUrl,
          picked,
          (l, _t, inst) => {
            setLoaded(l);
            // EMA smoothing — alpha 0.3
            setBpsSmoothed((prev) =>
              prev === 0 ? inst : prev * 0.7 + inst * 0.3,
            );
          },
          ac.signal,
        );

        setPhase("finalizing");
        await uploadComplete.mutateAsync({ videoId: newVideoId });

        setPhase("ready");
        onUploaded(newVideoId);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          setPhase("idle");
          setFile(null);
          setMeta(null);
          setInternalVideoId(null);
          return;
        }
        const msg = e instanceof Error ? e.message : "Upload failed";
        setError(msg);
        setPhase("error");
        toast.error(msg);
      }
    },
    [requestUpload, uploadComplete, onUploaded],
  );

  const onPick = () => inputRef.current?.click();

  const onCancel = useCallback(() => {
    abortRef.current?.abort();
    if (internalVideoId) {
      abandon.mutate({ videoId: internalVideoId });
    }
    setFile(null);
    setMeta(null);
    setLoaded(0);
    setBpsSmoothed(0);
    setInternalVideoId(null);
    setPhase("idle");
    setError(null);
    onCleared();
  }, [internalVideoId, abandon, onCleared]);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) void handleFile(f);
    },
    [handleFile],
  );

  if (phase === "idle") {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "border-border bg-muted/30 hover:bg-muted/50 relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors",
          isDragging && "border-primary bg-primary/5",
        )}
      >
        <div
          className={cn(
            "rounded-full p-3 shadow-sm transition-colors",
            isDragging
              ? "bg-primary/10 text-primary"
              : "bg-background text-muted-foreground",
          )}
        >
          <Upload className="h-5 w-5" />
        </div>
        <div>
          <p className="text-foreground text-sm font-medium">
            {isDragging
              ? "Drop to upload"
              : "Drop a video here, or click to browse"}
          </p>
          <p className="text-muted-foreground mt-1 text-[11px]">
            MP4 · MOV · MKV · WebM &nbsp;·&nbsp; up to {formatBytes(MAX_BYTES)}{" "}
            &nbsp;·&nbsp; transcoded to HLS automatically
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPick}
          className="mt-1 rounded-full"
        >
          Choose file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIMES.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
        {error && (
          <p className="text-destructive mt-1 text-[11px] font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Active card
  const total = file?.size ?? 0;
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
  const remaining = total - loaded;
  const etaSec =
    phase === "uploading" && bpsSmoothed > 1024
      ? Math.max(0, Math.round(remaining / bpsSmoothed))
      : null;

  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="flex gap-3 p-3">
        <div className="bg-muted relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md">
          {meta?.posterDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={meta.posterDataUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <FileVideo className="text-muted-foreground h-5 w-5" />
          )}
          {phase === "ready" && (
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/30 text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          )}
          {phase === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-500/30 text-white">
              <XCircle className="h-5 w-5" />
            </div>
          )}
          {(phase === "probing" || phase === "finalizing") && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-foreground truncate text-sm font-medium">
                {file?.name ?? "video"}
              </p>
              <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px]">
                <span>{file ? formatBytes(file.size) : ""}</span>
                {meta?.durationSec ? (
                  <>
                    <Dot />
                    <span className="font-mono">
                      {formatDurationSeconds(meta.durationSec)}
                    </span>
                  </>
                ) : null}
                {meta?.width && meta?.height ? (
                  <>
                    <Dot />
                    <span className="font-mono">
                      {meta.width}×{meta.height}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
            {phase !== "ready" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-muted-foreground hover:text-destructive shrink-0 gap-1 rounded-full px-2.5 text-[11px]"
              >
                <X className="h-3 w-3" />
                {phase === "uploading" || phase === "probing"
                  ? "Cancel"
                  : "Remove"}
              </Button>
            )}
          </div>

          {/* Progress lane */}
          {(phase === "uploading" ||
            phase === "finalizing" ||
            phase === "probing") && (
            <div className="mt-2.5">
              <div className="bg-muted relative h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500 ease-out",
                    phase === "finalizing"
                      ? "bg-amber-500"
                      : phase === "probing"
                        ? "bg-muted-foreground/30"
                        : "bg-primary",
                  )}
                  style={{
                    width: `${
                      phase === "finalizing"
                        ? 100
                        : phase === "probing"
                          ? 100
                          : pct
                    }%`,
                  }}
                />
              </div>
              <p className="text-muted-foreground mt-1 flex items-center justify-between font-mono text-[10px]">
                <span>
                  {phase === "probing"
                    ? "Reading file…"
                    : phase === "finalizing"
                      ? "Finalizing…"
                      : `${formatBytes(loaded)} of ${formatBytes(total)}`}
                </span>
                <span className="tabular-nums">
                  {phase === "uploading" && bpsSmoothed > 0 && (
                    <>{formatBytes(bpsSmoothed)}/s</>
                  )}
                  {etaSec !== null && (
                    <>
                      <span className="text-muted-foreground/40 mx-1">·</span>
                      <Clock className="-mt-0.5 mr-1 inline h-2.5 w-2.5" />
                      {formatDurationSeconds(etaSec)} left
                    </>
                  )}
                  {(phase === "uploading" || phase === "probing") && (
                    <>
                      <span className="text-muted-foreground/40 mx-1">·</span>
                      <span>{pct}%</span>
                    </>
                  )}
                </span>
              </p>
            </div>
          )}

          {phase === "ready" && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3 w-3" />
              Uploaded · transcoding starts in the background
            </p>
          )}

          {phase === "error" && error && (
            <p className="text-destructive mt-2 text-[11px]">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/40 select-none">
      ·
    </span>
  );
}
