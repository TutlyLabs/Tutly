"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  BellOff,
  BookOpen,
  ClipboardList,
  MessageSquare,
  Trophy,
  UserCheck,
  AlertCircle,
  CheckCheck,
  Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/trpc/react";
import { Button } from "@tutly/ui/button";
import { cn } from "@tutly/utils";
import { toast } from "sonner";

type NotificationEvent =
  | "CLASS_CREATED"
  | "ASSIGNMENT_CREATED"
  | "ASSIGNMENT_REVIEWED"
  | "LEADERBOARD_UPDATED"
  | "DOUBT_RESPONDED"
  | "ATTENDANCE_MISSED"
  | "CUSTOM_MESSAGE"
  | "CHAT_MENTION"
  | "DIRECT_MESSAGE";

const EVENT_META: Record<
  NotificationEvent,
  { icon: React.ElementType; label: string; color: string; bg: string }
> = {
  CLASS_CREATED: {
    icon: BookOpen,
    label: "New Class",
    color: "text-sky-600",
    bg: "bg-sky-100 dark:bg-sky-900/30",
  },
  ASSIGNMENT_CREATED: {
    icon: ClipboardList,
    label: "Assignment",
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  ASSIGNMENT_REVIEWED: {
    icon: CheckCheck,
    label: "Reviewed",
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  LEADERBOARD_UPDATED: {
    icon: Trophy,
    label: "Leaderboard",
    color: "text-violet-600",
    bg: "bg-violet-100 dark:bg-violet-900/30",
  },
  DOUBT_RESPONDED: {
    icon: MessageSquare,
    label: "Doubt",
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  ATTENDANCE_MISSED: {
    icon: AlertCircle,
    label: "Attendance",
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  CUSTOM_MESSAGE: {
    icon: Bell,
    label: "Message",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  CHAT_MENTION: {
    icon: MessageSquare,
    label: "Mention",
    color: "text-indigo-600",
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
  },
  DIRECT_MESSAGE: {
    icon: MessageSquare,
    label: "Direct Message",
    color: "text-teal-600",
    bg: "bg-teal-100 dark:bg-teal-900/30",
  },
};

function getNotificationLink(n: {
  customLink?: string | null;
  eventType: string;
  causedObjects?: unknown;
}): string | null {
  if (n.customLink) return n.customLink;
  const obj = (n.causedObjects ?? {}) as Record<string, string>;
  switch (n.eventType as NotificationEvent) {
    case "CLASS_CREATED":
      if (obj.courseId && obj.classId)
        return `/courses/class?id=${obj.courseId}&classId=${obj.classId}`;
      return null;
    case "ASSIGNMENT_CREATED":
    case "ASSIGNMENT_REVIEWED":
      if (obj.assignmentId) return `/assignments/detail?id=${obj.assignmentId}`;
      return null;
    case "DOUBT_RESPONDED":
      if (obj.doubtId) return `/doubts/${obj.doubtId}`;
      return null;
    case "LEADERBOARD_UPDATED":
      return "/leaderboard";
    case "ATTENDANCE_MISSED":
      return "/schedule";
    case "CHAT_MENTION":
    case "DIRECT_MESSAGE":
      if (obj.groupId) return `/community?g=${obj.groupId}`;
      return "/community";
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const utils = api.useUtils();
  const { data: notifications = [], isLoading } =
    api.notifications.getNotifications.useQuery();

  const toggle = api.notifications.toggleNotificationAsReadStatus.useMutation({
    onSuccess: () => void utils.notifications.getNotifications.invalidate(),
  });

  const markAll = api.notifications.markAllNotificationsAsRead.useMutation({
    onSuccess: () => {
      void utils.notifications.getNotifications.invalidate();
      toast.success("All notifications marked as read");
    },
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Bell className="text-primary h-5 w-5" />
            <h1 className="text-foreground text-xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {notifications.length} notification
            {notifications.length !== 1 ? "s" : ""}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
          >
            <Check className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-card h-20 animate-pulse rounded-xl border"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
            <BellOff className="text-muted-foreground h-8 w-8" />
          </div>
          <h2 className="text-foreground font-semibold">All caught up!</h2>
          <p className="text-muted-foreground text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {notifications.map((n) => {
            const meta =
              EVENT_META[n.eventType as NotificationEvent] ??
              EVENT_META.CUSTOM_MESSAGE;
            const Icon = meta.icon;
            const link = getNotificationLink(n);
            const isUnread = !n.readAt;
            const sender = (n as any).causedBy as {
              id: string;
              name: string;
              username: string;
              image: string | null;
            } | null;

            const content = (
              <div
                className={cn(
                  "bg-card flex items-start gap-3 rounded-xl border p-4 transition-all",
                  isUnread
                    ? "border-primary/20 bg-primary/5 shadow-sm"
                    : "opacity-80 hover:opacity-100",
                  link && "cursor-pointer hover:shadow-md",
                )}
                onClick={() => {
                  if (isUnread) toggle.mutate({ id: n.id });
                }}
              >
                {/* Event icon */}
                <div
                  className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                    meta.bg,
                  )}
                >
                  <Icon className={cn("h-5 w-5", meta.color)} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Sender */}
                      {sender && (
                        <div className="mb-1 flex items-center gap-1.5">
                          {sender.image ? (
                            <Image
                              src={sender.image}
                              alt={sender.name}
                              width={16}
                              height={16}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="bg-muted flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold">
                              {sender.name[0]}
                            </div>
                          )}
                          <Link
                            href={`/u/${sender.username}`}
                            className="text-foreground/70 text-xs font-medium hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {sender.name}
                          </Link>
                        </div>
                      )}
                      {/* Message */}
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          isUnread
                            ? "text-foreground font-medium"
                            : "text-foreground/80",
                        )}
                      >
                        {n.message ?? meta.label}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                      <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      {isUnread && (
                        <span className="bg-primary h-2 w-2 rounded-full" />
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                      meta.bg,
                      meta.color,
                    )}
                  >
                    {meta.label}
                  </span>
                </div>
              </div>
            );

            return (
              <div key={n.id}>
                {link ? (
                  <Link href={link} className="block">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
