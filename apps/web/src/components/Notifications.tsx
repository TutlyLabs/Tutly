"use client";

import type { Notification, NotificationEvent } from "@tutly/db/browser";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  BookOpen,
  Eye,
  EyeOff,
  Filter,
  Mail,
  MailOpen,
  MessageSquare,
  RefreshCcw,
  Smartphone,
  UserMinus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@tutly/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tutly/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@tutly/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@tutly/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tutly/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tutly/ui/tooltip";
import { useIsMobile } from "@tutly/hooks";
import type { SessionUser } from "@/lib/auth";
import { isNative } from "@/lib/native";
import day from "@tutly/utils/dayjs";
import { cn } from "@tutly/utils";

interface NotificationLink {
  href: string;
  external?: boolean;
}

type NotificationEventTypes = keyof typeof NotificationEvent;

export interface causedObjects {
  courseId?: string;
  classId?: string;
  assignmentId?: string;
  doubtId?: string;
}

export const NOTIFICATION_HREF_MAP: Record<
  NotificationEventTypes,
  (obj: causedObjects) => string
> = {
  CLASS_CREATED: (obj: causedObjects) => `/classes/${obj.classId}`,
  ASSIGNMENT_CREATED: (obj: causedObjects) =>
    `/assignments/detail?id=${obj.assignmentId}`,
  ASSIGNMENT_REVIEWED: (obj: causedObjects) =>
    `/assignments/detail?id=${obj.assignmentId}`,
  LEADERBOARD_UPDATED: (_obj: causedObjects) => `/leaderboard`,
  DOUBT_RESPONDED: (obj: causedObjects) => `/doubts/${obj.doubtId}`,
  ATTENDANCE_MISSED: (_obj: causedObjects) => `/attendance`,
  CUSTOM_MESSAGE: (_obj: causedObjects) => `/`,
};

const DEFAULT_NOTIFICATION_CONFIG = {
  label: "Notification",
  icon: Bell,
  color: "text-gray-500",
  bgColor: "bg-gray-500/10",
  getLink: () => ({
    href: "#",
    external: false,
  }),
};

const NOTIFICATION_TYPES: Record<
  NotificationEventTypes,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    getLink: (causedObjects: causedObjects) => NotificationLink;
  }
> = {
  CLASS_CREATED: {
    label: "Classes",
    icon: BookOpen,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    getLink: (obj) => ({
      href: NOTIFICATION_HREF_MAP.CLASS_CREATED(obj),
      external: true,
    }),
  },
  ASSIGNMENT_CREATED: {
    label: "Assignments",
    icon: BookOpen,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    getLink: (obj) => ({
      href: NOTIFICATION_HREF_MAP.ASSIGNMENT_CREATED(obj),
      external: true,
    }),
  },
  ASSIGNMENT_REVIEWED: {
    label: "Reviews",
    icon: Eye,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    getLink: (obj) => ({
      href: NOTIFICATION_HREF_MAP.ASSIGNMENT_REVIEWED(obj),
      external: true,
    }),
  },
  LEADERBOARD_UPDATED: {
    label: "Leaderboard",
    icon: RefreshCcw,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    getLink: (obj) => ({
      href: NOTIFICATION_HREF_MAP.LEADERBOARD_UPDATED(obj),
      external: true,
    }),
  },
  DOUBT_RESPONDED: {
    label: "Doubts",
    icon: MessageSquare,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    getLink: (obj) => ({
      href: NOTIFICATION_HREF_MAP.DOUBT_RESPONDED(obj),
      external: true,
    }),
  },
  ATTENDANCE_MISSED: {
    label: "Attendance",
    icon: UserMinus,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    getLink: (obj) => ({
      href: NOTIFICATION_HREF_MAP.ATTENDANCE_MISSED(obj),
      external: true,
    }),
  },
  CUSTOM_MESSAGE: {
    label: "Messages",
    icon: MessageSquare,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    getLink: (obj) => ({
      href: NOTIFICATION_HREF_MAP.CUSTOM_MESSAGE(obj),
      external: false,
    }),
  },
};

const filterCategories = Object.entries(NOTIFICATION_TYPES).map(
  ([type, config]) => ({
    type,
    label: config.label,
  }),
);

function getNotificationLink(notification: Notification): string | null {
  const config =
    NOTIFICATION_TYPES[notification.eventType] || DEFAULT_NOTIFICATION_CONFIG;
  if (!config) return null;
  return config.getLink(notification.causedObjects as causedObjects).href;
}

function NotificationsCTA() {
  const [pushStatus, setPushStatus] = useState<
    "granted" | "denied" | "prompt" | "unsupported" | null
  >(null);
  const [busy, setBusy] = useState(false);
  const native = typeof window !== "undefined" && isNative();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!native) {
        if (typeof window !== "undefined" && "Notification" in window) {
          setPushStatus(window.Notification.permission as typeof pushStatus);
        } else {
          setPushStatus("unsupported");
        }
        return;
      }
      try {
        const { PushNotifications } = await import(
          "@capacitor/push-notifications"
        );
        const perm = await PushNotifications.checkPermissions();
        if (cancelled) return;
        if (perm.receive === "granted") setPushStatus("granted");
        else if (perm.receive === "denied") setPushStatus("denied");
        else setPushStatus("prompt");
      } catch {
        setPushStatus("unsupported");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [native]);

  if (pushStatus === "granted" || pushStatus === null) return null;

  if (!native) {
    return (
      <div className="bg-primary/5 border-primary/20 mx-3 my-2 flex items-start gap-3 rounded-lg border p-3">
        <Smartphone className="text-primary mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex-1 text-xs">
          <p className="text-foreground font-medium">
            Never miss a notification
          </p>
          <p className="text-muted-foreground mt-0.5">
            Install the Tutly app to get push notifications on your phone.
          </p>
        </div>
      </div>
    );
  }

  const handleEnable = async () => {
    setBusy(true);
    try {
      const { PushNotifications } = await import(
        "@capacitor/push-notifications"
      );
      const perm = await PushNotifications.checkPermissions();
      const status =
        perm.receive === "granted"
          ? "granted"
          : (await PushNotifications.requestPermissions()).receive;
      if (status === "granted") {
        await PushNotifications.register();
        setPushStatus("granted");
        toast.success("Notifications enabled");
      } else {
        setPushStatus("denied");
        toast.error("Notification permission denied");
      }
    } catch (err) {
      toast.error("Could not enable notifications");
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-primary/5 border-primary/20 mx-3 my-2 flex items-center gap-3 rounded-lg border p-3">
      <BellRing className="text-primary h-5 w-5 shrink-0" />
      <div className="flex-1 text-xs">
        <p className="text-foreground font-medium">Enable push notifications</p>
        <p className="text-muted-foreground mt-0.5">
          Get notified instantly about classes, assignments and doubts.
        </p>
      </div>
      {pushStatus === "denied" ? (
        <span className="text-muted-foreground text-[11px]">
          Enable in device settings
        </span>
      ) : (
        <Button size="sm" onClick={handleEnable} disabled={busy}>
          Enable
        </Button>
      )}
    </div>
  );
}

interface NotificationsPanelProps {
  notifications: Notification[];
  unreadCount: number;
  isFetching: boolean;
  onRefetch: () => void;
  onToggleRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  selectedCategories: NotificationEventTypes[];
  setSelectedCategories: (cats: NotificationEventTypes[]) => void;
  onItemClick: (n: Notification) => void;
  contained?: boolean;
}

function NotificationsPanel({
  notifications,
  unreadCount,
  isFetching,
  onRefetch,
  onToggleRead,
  onMarkAllAsRead,
  selectedCategories,
  setSelectedCategories,
  onItemClick,
  contained = false,
}: NotificationsPanelProps) {
  const [activeTab, setActiveTab] = useState("all");
  const filteredNotifications = useMemo(
    () =>
      notifications.filter(
        (n) =>
          selectedCategories.length === 0 ||
          selectedCategories.includes(n.eventType),
      ),
    [notifications, selectedCategories],
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className={cn("flex h-full flex-col")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <TabsList className="bg-muted/50 h-9 p-1">
          <TabsTrigger value="all" className="h-7 px-3 text-xs">
            <Bell className="mr-1.5 h-3.5 w-3.5" />
            All
          </TabsTrigger>
          <TabsTrigger value="unread" className="h-7 px-3 text-xs">
            <EyeOff className="mr-1.5 h-3.5 w-3.5" />
            Unread{" "}
            {unreadCount > 0 && (
              <span className="bg-primary/15 text-primary ml-1.5 rounded-full px-1.5 py-px text-[10px]">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onRefetch}
            disabled={isFetching}
            aria-label="Refresh notifications"
          >
            <RefreshCcw
              className={cn(
                "h-4 w-4",
                isFetching ? "animate-spin" : undefined,
              )}
            />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Filter notifications"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filterCategories.map(({ type, label }) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={selectedCategories.includes(
                    type as NotificationEventTypes,
                  )}
                  onCheckedChange={(checked) => {
                    setSelectedCategories(
                      checked
                        ? [
                            ...selectedCategories,
                            type as NotificationEventTypes,
                          ]
                        : selectedCategories.filter((t) => t !== type),
                    );
                  }}
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <NotificationsCTA />

      {selectedCategories.length > 0 && (
        <div className="flex items-center justify-between gap-2 overflow-x-auto border-b px-3 py-2">
          <div className="flex items-center gap-1.5">
            {selectedCategories.map((category) => (
              <div
                key={category}
                className="bg-primary/10 text-primary flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
              >
                {filterCategories.find((f) => f.type === category)?.label}
                <button
                  type="button"
                  className="hover:bg-primary/20 rounded-full p-0.5"
                  onClick={() =>
                    setSelectedCategories(
                      selectedCategories.filter((t) => t !== category),
                    )
                  }
                  aria-label={`Remove filter ${category}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary text-xs"
            onClick={() => setSelectedCategories([])}
          >
            Clear all
          </Button>
        </div>
      )}

      {(["all", "unread"] as const).map((tab) => (
        <TabsContent
          key={tab}
          value={tab}
          className={cn(
            "m-0 flex flex-1 flex-col overflow-hidden",
            contained ? "" : "min-h-0",
          )}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-px py-1">
              {filteredNotifications
                .filter((n) => (tab === "all" ? true : !n.readAt))
                .map((notification) => {
                  const config =
                    NOTIFICATION_TYPES[notification.eventType] ||
                    DEFAULT_NOTIFICATION_CONFIG;
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "group hover:bg-accent/40 flex items-start gap-3 px-3 py-3 transition-colors",
                        getNotificationLink(notification) && "cursor-pointer",
                        !notification.readAt && "bg-primary/[0.025]",
                      )}
                      onClick={() => onItemClick(notification)}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          config.bgColor,
                          notification.readAt && "opacity-60",
                        )}
                      >
                        <config.icon
                          className={cn("h-[18px] w-[18px]", config.color)}
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p
                          className={cn(
                            "text-foreground text-sm leading-snug",
                            notification.readAt && "text-muted-foreground",
                          )}
                        >
                          {notification.message}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {day(notification.createdAt).fromNow()}
                        </p>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleRead(notification.id);
                              }}
                              className="h-7 w-7 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                              aria-label={
                                notification.readAt
                                  ? "Mark as unread"
                                  : "Mark as read"
                              }
                            >
                              {notification.readAt ? (
                                <MailOpen className="text-muted-foreground h-4 w-4" />
                              ) : (
                                <Mail className="text-primary h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {notification.readAt
                              ? "Mark as unread"
                              : "Mark as read"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  );
                })}
            </div>

            {filteredNotifications.filter((n) =>
              tab === "all" ? true : !n.readAt,
            ).length === 0 && (
              <div className="flex h-full min-h-[220px] items-center justify-center">
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                  <div className="bg-muted/50 flex h-12 w-12 items-center justify-center rounded-full">
                    <Bell className="text-muted-foreground/70 h-5 w-5" />
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {selectedCategories.length > 0
                      ? "No notifications in selected categories"
                      : tab === "unread"
                        ? "You're all caught up"
                        : "No notifications yet"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {unreadCount > 0 && (
            <div className="bg-background border-t">
              <Button
                variant="ghost"
                className="hover:bg-accent/50 text-muted-foreground hover:text-primary h-11 w-full justify-center text-sm"
                onClick={onMarkAllAsRead}
              >
                Mark all as read
              </Button>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export default function Notifications({ user: _user }: { user: SessionUser }) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const {
    data: notifications = [],
    refetch: refetchNotifications,
    isFetching: isRefetchingNotifications,
  } = api.notifications.getNotifications.useQuery();
  const { mutate: toggleReadStatus } =
    api.notifications.toggleNotificationAsReadStatus.useMutation({
      onSuccess: () => {
        void refetchNotifications();
      },
      onError: () => {
        toast.error("Failed to update notification");
      },
    });
  const { mutate: markAllAsRead } =
    api.notifications.markAllNotificationsAsRead.useMutation({
      onSuccess: () => {
        void refetchNotifications();
      },
      onError: () => {
        toast.error("Failed to mark all as read");
      },
    });

  const unreadCount = useMemo(
    () => notifications.filter((n: Notification) => !n.readAt).length,
    [notifications],
  );

  const [selectedCategories, setSelectedCategories] = useState<
    NotificationEventTypes[]
  >([]);

  const handleNotificationClick = (notification: Notification) => {
    const notificationType =
      NOTIFICATION_TYPES[notification.eventType] || DEFAULT_NOTIFICATION_CONFIG;
    if (!notificationType) return;
    if (!notification.readAt) {
      toggleReadStatus({ id: notification.id });
    }

    if (notification.customLink) {
      window.open(notification.customLink, "_blank");
      return;
    }

    const link = notificationType.getLink(
      notification.causedObjects as causedObjects,
    );
    if (link) {
      if (link.external) {
        window.open(link.href, "_blank");
      } else {
        router.push(link.href);
      }
      setOpen(false);
    }
  };

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className="hover:bg-accent/60 relative h-9 w-9"
      aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="bg-destructive ring-background absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white ring-2">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b px-3 py-3">
            <SheetTitle className="text-base">Notifications</SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col overflow-hidden">
            <NotificationsPanel
              notifications={notifications}
              unreadCount={unreadCount}
              isFetching={isRefetchingNotifications}
              onRefetch={() => void refetchNotifications()}
              onToggleRead={(id) => toggleReadStatus({ id })}
              onMarkAllAsRead={() => markAllAsRead()}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              onItemClick={handleNotificationClick}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="bg-popover w-[440px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border p-0 shadow-xl"
      >
        <div className="flex h-[520px] flex-col overflow-hidden">
          <NotificationsPanel
            notifications={notifications}
            unreadCount={unreadCount}
            isFetching={isRefetchingNotifications}
            onRefetch={() => void refetchNotifications()}
            onToggleRead={(id) => toggleReadStatus({ id })}
            onMarkAllAsRead={() => markAllAsRead()}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            onItemClick={handleNotificationClick}
            contained
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
