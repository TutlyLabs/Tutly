import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { NOTIFICATION_HREF_MAP } from "@/components/Notifications";
import type { causedObjects } from "@/components/Notifications";

interface NotificationRedirectPageProps {
  params: Promise<{ id: string }>;
}

export default async function NotificationRedirectPage({
  params,
}: NotificationRedirectPageProps) {
  try {
    const { id: notificationId } = await params;
    if (!notificationId) {
      redirect("/notifications");
    }

    const notificationData =
      await api.notifications.getNotificationRedirectData({
        notificationId,
      });

    if (!notificationData?.success) {
      redirect("/notifications");
    }

    const { data } = notificationData;

    if (!data) {
      redirect("/notifications");
    }

    // Handle custom link redirect
    if (data.redirectUrl) {
      redirect(data.redirectUrl);
    }

    // Handle event-based redirect
    if (!data.eventType || !(data.eventType in NOTIFICATION_HREF_MAP)) {
      redirect("/notifications");
    }

    const getLinkFn =
      NOTIFICATION_HREF_MAP[
        data.eventType as keyof typeof NOTIFICATION_HREF_MAP
      ];
    if (!getLinkFn) {
      redirect("/notifications");
    }

    const redirectUrl = getLinkFn(data.causedObj as causedObjects);
    redirect(redirectUrl);
  } catch (error) {
    redirect("/notifications");
  }
}
