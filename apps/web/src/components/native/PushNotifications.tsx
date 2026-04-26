"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { useClientSession } from "@/lib/auth/client";
import { getPlatform, isNative } from "@/lib/native";
import { api } from "@/trpc/react";

export default function PushNotifications() {
  const session = useClientSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const register = api.deviceTokens.register.useMutation();

  const userId = session.data?.user?.id;

  useEffect(() => {
    if (!isNative() || !userId) return;
    const platform = getPlatform();
    if (platform !== "ios" && platform !== "android") return;

    let cancelled = false;
    const subs: { remove: () => Promise<void> }[] = [];

    void (async () => {
      const { PushNotifications } = await import(
        "@capacitor/push-notifications"
      );
      if (cancelled) return;

      const perm = await PushNotifications.checkPermissions();
      const status =
        perm.receive === "granted"
          ? "granted"
          : (await PushNotifications.requestPermissions()).receive;
      if (status !== "granted") return;

      subs.push(
        await PushNotifications.addListener("registration", (token) => {
          register.mutate({
            token: token.value,
            platform: platform === "ios" ? "IOS" : "ANDROID",
          });
        }),
        await PushNotifications.addListener("registrationError", (err) => {
          console.error("Push registration failed:", err);
        }),
        await PushNotifications.addListener(
          "pushNotificationReceived",
          () => {
            void queryClient.invalidateQueries({
              queryKey: [["notifications", "getNotifications"]],
            });
          },
        ),
        await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (event) => {
            const data = event.notification.data as
              | { url?: string }
              | undefined;
            if (data?.url) {
              try {
                const url = new URL(data.url);
                router.push(`${url.pathname}${url.search}${url.hash}`);
              } catch {
                router.push(data.url);
              }
            }
          },
        ),
      );

      await PushNotifications.register();
    })();

    return () => {
      cancelled = true;
      for (const s of subs) void s.remove();
    };
  }, [userId, router, queryClient, register]);

  return null;
}
