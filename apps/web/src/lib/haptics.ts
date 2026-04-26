import { isNative } from "@/lib/native";

type Severity = "success" | "warning" | "error";

const run = async (
  fn: (mod: typeof import("@capacitor/haptics")) => Promise<unknown> | unknown,
) => {
  if (!isNative()) return;
  try {
    const mod = await import("@capacitor/haptics");
    await fn(mod);
  } catch {
    // Plugin may be unavailable (e.g. older native shell); fail silently.
  }
};

export const haptics = {
  light: () =>
    run(({ Haptics, ImpactStyle }) =>
      Haptics.impact({ style: ImpactStyle.Light }),
    ),
  medium: () =>
    run(({ Haptics, ImpactStyle }) =>
      Haptics.impact({ style: ImpactStyle.Medium }),
    ),
  heavy: () =>
    run(({ Haptics, ImpactStyle }) =>
      Haptics.impact({ style: ImpactStyle.Heavy }),
    ),
  selection: () => run(({ Haptics }) => Haptics.selectionStart()),
  notify: (type: Severity) =>
    run(({ Haptics, NotificationType }) => {
      const map = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      } as const;
      return Haptics.notification({ type: map[type] });
    }),
};
