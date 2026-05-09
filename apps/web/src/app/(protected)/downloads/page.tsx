"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Download as DownloadIcon,
  PlayCircle,
  Smartphone,
  Trash2,
  WifiOff,
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
import { Button } from "@tutly/ui/button";
import { Skeleton } from "@tutly/ui/skeleton";
import { dayjs, formatBytes, formatDurationSeconds } from "@tutly/utils";

import { isNative } from "@/lib/native";
import {
  listOfflineVideos,
  removeOfflineVideo,
  type OfflineVideoMeta,
} from "@/lib/offline-video";

export default function DownloadsPage() {
  const [native, setNative] = useState(false);
  const [items, setItems] = useState<OfflineVideoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<OfflineVideoMeta | null>(null);

  useEffect(() => {
    setNative(isNative());
    void (async () => {
      const list = await listOfflineVideos();
      setItems(list);
      setLoading(false);
    })();
  }, []);

  const totalBytes = items.reduce((sum, i) => sum + i.totalBytes, 0);

  const removeOne = async (videoId: string) => {
    await removeOfflineVideo(videoId);
    setItems((prev) => prev.filter((i) => i.videoId !== videoId));
    setConfirm(null);
    toast.success("Removed offline copy");
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      {/* Hero */}
      <div className="bg-card relative overflow-hidden rounded-2xl border p-5 shadow-sm">
        <div className="bg-primary/10 pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-foreground inline-flex items-center gap-2 text-xl font-semibold">
              <DownloadIcon className="text-primary h-5 w-5" />
              My downloads
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Class videos saved on this device for offline viewing.
            </p>
          </div>
          {items.length > 0 && (
            <div className="bg-muted/60 text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {items.length} saved · {formatBytes(totalBytes)}
            </div>
          )}
        </div>
      </div>

      {!native ? (
        <EmptyHint
          icon={<Smartphone className="text-muted-foreground h-6 w-6" />}
          title="Available on the mobile app"
          message="Open Tutly on iOS or Android to save classes for offline viewing."
        />
      ) : loading ? (
        <ul className="bg-card divide-border divide-y rounded-xl border shadow-sm">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-12 w-20 rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-8 w-16 rounded-full" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <EmptyHint
          icon={<WifiOff className="text-muted-foreground h-6 w-6" />}
          title="No offline videos yet"
          message="Open any class with an HLS video and tap Save offline to download it for later."
        />
      ) : (
        <ul className="bg-card divide-border divide-y rounded-xl border shadow-sm">
          {items.map((item) => (
            <DownloadRow
              key={item.videoId}
              item={item}
              onRemove={() => setConfirm(item)}
            />
          ))}
        </ul>
      )}

      <AlertDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove offline copy?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm
                ? `Frees up ${formatBytes(confirm.totalBytes)} on your device. You can re-download whenever you're back online.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirm && removeOne(confirm.videoId)}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DownloadRow({
  item,
  onRemove,
}: {
  item: OfflineVideoMeta;
  onRemove: () => void;
}) {
  const playHref = `/downloads/play?videoId=${item.videoId}`;
  const courseLine = item.courseId ? "Tutly course" : null; // course title not in meta yet

  return (
    <li className="group hover:bg-muted/30 flex items-start gap-3 px-3 py-3 transition-colors sm:items-center sm:px-4">
      <Link
        href={playHref}
        className="bg-muted relative flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md sm:h-14 sm:w-24"
      >
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <PlayCircle className="text-muted-foreground h-6 w-6" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
          <PlayCircle className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </Link>

      <div className="min-w-0 flex-1">
        {courseLine && (
          <p className="text-muted-foreground truncate text-[10px] font-medium tracking-wide uppercase">
            {courseLine}
          </p>
        )}
        <Link
          href={playHref}
          className="text-foreground hover:text-primary block truncate text-sm font-medium transition-colors"
        >
          {item.classTitle ?? "Class video"}
        </Link>
        <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center text-[11px]">
          <Clock className="mr-1 h-3 w-3" />
          <span>Saved {dayjs(item.downloadedAt).fromNow()}</span>
          <Dot />
          <span className="font-mono">{formatBytes(item.totalBytes)}</span>
          {item.durationSec ? (
            <>
              <Dot />
              <span className="font-mono">
                {formatDurationSeconds(item.durationSec)}
              </span>
            </>
          ) : null}
          <Dot />
          <span className="font-mono">{item.rendition || "720p"}</span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1 self-start sm:self-center">
        <Link href={playHref}>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3 text-xs"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Play
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive h-8 w-8"
          aria-label="Remove offline copy"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/40 mx-1.5 select-none">
      ·
    </span>
  );
}

function EmptyHint({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="bg-card border-border flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center">
      <div className="bg-muted/60 rounded-full p-4">{icon}</div>
      <div>
        <p className="text-foreground text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground mt-1 text-xs">{message}</p>
      </div>
    </div>
  );
}
