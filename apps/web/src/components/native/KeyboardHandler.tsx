"use client";

import { useEffect } from "react";

import { isNative } from "@/lib/native";

const isEditable = (el: Element | null): boolean => {
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    (el as HTMLElement).isContentEditable
  );
};

export default function KeyboardHandler() {
  useEffect(() => {
    if (!isNative()) return;

    let cleanup: (() => void) | undefined;

    void (async () => {
      const { Keyboard } = await import("@capacitor/keyboard");

      const showSub = await Keyboard.addListener("keyboardWillShow", () => {
        const el = document.activeElement;
        if (!isEditable(el)) return;
        setTimeout(() => {
          (el as HTMLElement).scrollIntoView({
            block: "center",
            behavior: "smooth",
          });
        }, 50);
      });

      const onPointerDown = (e: PointerEvent) => {
        const target = e.target as Element | null;
        if (isEditable(target) || target?.closest("input, textarea, [contenteditable='true']")) {
          return;
        }
        const active = document.activeElement;
        if (isEditable(active)) {
          (active as HTMLElement).blur();
          void Keyboard.hide();
        }
      };
      document.addEventListener("pointerdown", onPointerDown, { passive: true });

      cleanup = () => {
        void showSub.remove();
        document.removeEventListener("pointerdown", onPointerDown);
      };
    })();

    return () => cleanup?.();
  }, []);

  return null;
}
