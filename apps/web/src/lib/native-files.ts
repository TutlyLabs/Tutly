import { isNative } from "@/lib/native";

const stripDataUrlPrefix = (dataUrl: string): string => {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
};

const triggerWebDownload = (href: string, filename: string) => {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export async function saveDataUrl(
  dataUrl: string,
  filename: string,
): Promise<void> {
  if (!isNative()) {
    triggerWebDownload(dataUrl, filename);
    return;
  }

  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);

  const written = await Filesystem.writeFile({
    path: filename,
    data: stripDataUrlPrefix(dataUrl),
    directory: Directory.Cache,
  });

  await Share.share({
    title: filename,
    url: written.uri,
    dialogTitle: "Save or share",
  });
}

export async function openExternalUrl(url: string): Promise<void> {
  if (!isNative()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url });
}

export async function shareUrl(opts: {
  url: string;
  title?: string;
  text?: string;
}): Promise<void> {
  if (!isNative()) {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: opts.title,
          text: opts.text,
          url: opts.url,
        });
        return;
      } catch {
        // user cancelled or web share unsupported — fall through to clipboard
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(opts.url);
    }
    return;
  }

  const { Share } = await import("@capacitor/share");
  await Share.share({
    title: opts.title,
    text: opts.text,
    url: opts.url,
    dialogTitle: opts.title ?? "Share",
  });
}
