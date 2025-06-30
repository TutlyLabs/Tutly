"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { NOTIFICATION_HREF_MAP } from "@/components/Notifications";
import type { causedObjects } from "@/components/Notifications";

export default function NotificationRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id: notificationId }) => {
      if (!notificationId) {
        router.push("/notifications");
        return;
      }
      setId(notificationId);
    });
  }, [params, router]);

  const {
    data: notificationData,
    isLoading,
    error,
  } = api.notifications.getNotificationRedirectData.useQuery(
    { notificationId: id! },
    { enabled: !!id },
  );

  useEffect(() => {
    if (!notificationData?.success) {
      if (error || notificationData?.error) {
        router.push("/notifications");
      }
      return;
    }

    const { data } = notificationData;

    if (!data) {
      router.push("/notifications");
      return;
    }

    // Handle custom link redirect
    if (data.redirectUrl) {
      router.push(data.redirectUrl);
      return;
    }

    // Handle event-based redirect
    if (!data.eventType || !(data.eventType in NOTIFICATION_HREF_MAP)) {
      router.push("/notifications");
      return;
    }

    const getLinkFn =
      NOTIFICATION_HREF_MAP[
        data.eventType as keyof typeof NOTIFICATION_HREF_MAP
      ];
    if (!getLinkFn) {
      router.push("/notifications");
      return;
    }

    const redirectUrl = getLinkFn(data.causedObj as causedObjects);
    router.push(redirectUrl);
  }, [notificationData, error, router]);

  if (isLoading) {
    return <div>Loading notification...</div>;
  }

  if (!id) {
    return <div>Loading...</div>;
  }

  return null;
}
