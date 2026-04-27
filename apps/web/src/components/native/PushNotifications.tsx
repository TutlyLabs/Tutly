"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { useClientSession } from "@/lib/auth/client";
import { getPlatform, isNative } from "@/lib/native";
import { api } from "@/trpc/react";

let lastSent: { userId: string; token: string } | null = null;

export default function PushNotifications() {
  const session = useClientSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const registerMutation = api.deviceTokens.register.useMutation();

  const userId = session.data?.user?.id;

  const handlersRef = useRef({ router, queryClient, registerMutation });
  handlersRef.current = { router, queryClient, registerMutation };

  useEffect(() => {
    if (!isNative() || !userId) return;
    const platform = getPlatform();
    if (platform !== "ios" && platform !== "android") return;

    let cancelled = false;
    const subs: { remove: () => Promise<void> }[] = [];

    const track = (sub: { remove: () => Promise<void> }) => {
      if (cancelled) {
        void sub.remove();
        return;
      }
      subs.push(sub);
    };

    void (async () => {
      const { PushNotifications } = await import(
        "@capacitor/push-notifications"
      );
      if (cancelled) return;

      const perm = await PushNotifications.checkPermissions();
      if (cancelled) return;
      const status =
        perm.receive === "granted"
          ? "granted"
          : (await PushNotifications.requestPermissions()).receive;
      if (cancelled || status !== "granted") return;

      track(
        await PushNotifications.addListener("registration", (token) => {
          if (cancelled) return;
          if (
            lastSent &&
            lastSent.userId === userId &&
            lastSent.token === token.value
          ) {
            return;
          }
          lastSent = { userId, token: token.value };
          handlersRef.current.registerMutation.mutate({
            token: token.value,
            platform: platform === "ios" ? "IOS" : "ANDROID",
          });
        }),
      );
      track(
        await PushNotifications.addListener("registrationError", (err) => {
          console.error("Push registration failed:", err);
        }),
      );
      track(
        await PushNotifications.addListener("pushNotificationReceived", () => {
          if (cancelled) return;
          void handlersRef.current.queryClient.invalidateQueries({
            queryKey: [["notifications", "getNotifications"]],
          });
        }),
      );
      track(
        await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (event) => {
            if (cancelled) return;
            const data = event.notification.data as
              | { url?: string }
              | undefined;
            if (!data?.url) return;
            try {
              const url = new URL(data.url);
              handlersRef.current.router.push(
                `${url.pathname}${url.search}${url.hash}`,
              );
            } catch {
              handlersRef.current.router.push(data.url);
            }
          },
        ),
      );

      if (cancelled) return;
      await PushNotifications.register();
    })();

    return () => {
      cancelled = true;
      for (const s of subs) void s.remove();
    };
  }, [userId]);

  return null;
}
