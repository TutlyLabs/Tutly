"use client";

import type { Notification, NotificationEvent } from "@prisma/client";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  BookOpen,
  Eye,
  EyeOff,
  Filter,
  Mail,
  MailOpen,
  MessageSquare,
  RefreshCcw,
  UserMinus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SessionUser } from "@tutly/auth";
import day from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { NEXT_PUBLIC_VAPID_PUBLIC_KEY } from "@/lib/constants";

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

export const NOTIFICATION_HREF_MAP: Record<NotificationEventTypes, (obj: causedObjects) => string> = {
  CLASS_CREATED: (obj: causedObjects) => `/classes/${obj.classId}`,
  ASSIGNMENT_CREATED: (obj: causedObjects) => `/assignments/${obj.assignmentId}`,
  ASSIGNMENT_REVIEWED: (obj: causedObjects) => `/assignments/${obj.assignmentId}`,
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

const filterCategories = Object.entries(NOTIFICATION_TYPES).map(([type, config]) => ({
  type,
  label: config.label,
}));

type SubscriptionStatus = "NotSubscribed" | "SubscribedOnThisDevice" | "SubscribedOnAnotherDevice";

interface PushSubscriptionConfig {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function getNotificationLink(notification: Notification): string | null {
  const config = NOTIFICATION_TYPES[notification.eventType] || DEFAULT_NOTIFICATION_CONFIG;
  if (!config) return null;
  return config.getLink(notification.causedObjects as causedObjects).href;
}

export default function Notifications({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>("NotSubscribed");
  const [activeTab, setActiveTab] = useState("all");

  const { data: notifications = [], refetch: refetchNotifications, isFetching: isRefetchingNotifications } = api.notifications.getNotifications.useQuery();
  const { mutate: toggleReadStatus } = api.notifications.toggleNotificationAsReadStatus.useMutation({
    onSuccess: () => {
      void refetchNotifications();
    },
    onError: () => {
      toast.error("Failed to update notification");
    },
  });
  const { mutate: markAllAsRead } = api.notifications.markAllNotificationsAsRead.useMutation({
    onSuccess: () => {
      void refetchNotifications();
    },
    onError: () => {
      toast.error("Failed to mark all as read");
    },
  });
  const { data: notificationConfig } = api.notifications.getNotificationConfig.useQuery(
    { userId: user.id },
    { enabled: !!user.id }
  );
  const { mutate: updateNotificationConfig } = api.notifications.updateNotificationConfig.useMutation({
    onError: () => {
      toast.error("Failed to update notification config");
    },
  });

  const subscribe = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsSubscribing(true);

      if (!("serviceWorker" in navigator)) {
        toast.error("Service Workers are not supported in this browser");
        return;
      }

      if (!("PushManager" in window)) {
        toast.error("Push notifications are not supported in this browser");
        return;
      }

      if (Notification.permission === "denied") {
        toast.warning("Notification permission denied");
        return;
      }

      if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.warning("Notification permission denied");
          return;
        }
      }

      const public_key = NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!public_key) {
        toast.error("Push notification public key not configured");
        return;
      }

      try {
        const sw = await navigator.serviceWorker.ready;
        if (!sw.pushManager) {
          toast.error("Push manager not available");
          return;
        }

        const subscription = await sw.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: public_key,
        });

        if (!subscription) {
          toast.error("Failed to create subscription");
          return;
        }

        const p256dh = btoa(
          String.fromCharCode.apply(
            null,
            Array.from(new Uint8Array(subscription.getKey("p256dh")!))
          )
        );

        const auth = btoa(
          String.fromCharCode.apply(
            null,
            Array.from(new Uint8Array(subscription.getKey("auth")!))
          )
        );

        const config: PushSubscriptionConfig = {
          endpoint: subscription.endpoint,
          p256dh: p256dh,
          auth: auth,
        };

        updateNotificationConfig({ userId: user.id, config });

        setSubscriptionStatus("SubscribedOnThisDevice");
        toast.success("Subscribed successfully");
      } catch {
        toast.error("Service worker subscription failed");
        return;
      }
    } catch {
      toast.error("Subscription failed");
    } finally {
      setIsSubscribing(false);
    }
  }, [user?.id, updateNotificationConfig]);

  const unsubscribe = useCallback(async () => {
    if (!user?.id) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.pushManager) {
        toast.error("Push manager not available");
        return;
      }

      setIsSubscribing(true);
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        updateNotificationConfig({
          userId: user.id,
          config: {
            endpoint: "",
            p256dh: "",
            auth: "",
          },
        });

        setSubscriptionStatus("NotSubscribed");
        toast.warning("Unsubscribed successfully");
      }
    } catch {
      toast.error("Unsubscribe failed");
    } finally {
      setIsSubscribing(false);
    }
  }, [user?.id, updateNotificationConfig]);

  const handleSubscribeClick = useCallback(() => {
    if (!navigator.serviceWorker) {
      toast.error("Push notifications are not supported in this browser");
      return;
    }

    if (subscriptionStatus === "SubscribedOnThisDevice") {
      void unsubscribe();
    } else {
      void subscribe();
    }
  }, [subscriptionStatus, subscribe, unsubscribe]);

  const initialSubscriptionState = useCallback(async () => {
    try {
      if (!user?.id) return;

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      // If no config endpoint exists, user is not subscribed anywhere
      if (!notificationConfig?.endpoint) {
        // If we have a subscription on this device but no config, clean it up
        if (subscription) {
          await subscription.unsubscribe();
        }
        setSubscriptionStatus("NotSubscribed");
        return;
      }

      // If there's a subscription on this device
      if (subscription) {
        // Compare current subscription endpoint with stored config
        if (subscription.endpoint === notificationConfig.endpoint) {
          setSubscriptionStatus("SubscribedOnThisDevice");
        } else {
          // Different subscription exists on this device - clean up and
          // recognize the one on the server as the valid one
          console.log("Different subscription exists - cleaning up local subscription");
          await subscription.unsubscribe(); // Clean up old subscription
          setSubscriptionStatus("SubscribedOnAnotherDevice");
        }
      } else {
        // No subscription on this device, but config exists
        setSubscriptionStatus("SubscribedOnAnotherDevice");
      }
    } catch (error) {
      console.error("Failed to fetch subscription status:", error);
      toast.error("Failed to fetch subscription status");
    }
  }, [user?.id, notificationConfig]);

  useEffect(() => {
    let mounted = true;

    const checkSubscription = async () => {
      if (!mounted) return;
      await initialSubscriptionState();
    };

    void checkSubscription();

    return () => {
      mounted = false;
    };
  }, [initialSubscriptionState]);

  const unreadCount = useMemo(
    () => notifications.filter((n: Notification) => !n.readAt).length,
    [notifications]
  );

  const [selectedCategories, setSelectedCategories] = useState<NotificationEventTypes[]>([]);

  const filteredNotifications = useMemo(
    () =>
      notifications.filter(
        (n: Notification) =>
          selectedCategories.length === 0 || selectedCategories.includes(n.eventType)
      ),
    [notifications, selectedCategories]
  );

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

    const link = notificationType.getLink(notification.causedObjects as causedObjects);
    if (link) {
      if (link.external) {
        window.open(link.href, "_blank");
      } else {
        router.push(link.href);
      }
    }
  };

  const getSubscriptionButtonText = () => {
    switch (subscriptionStatus) {
      case "SubscribedOnThisDevice":
        return "Unsubscribe";
      case "SubscribedOnAnotherDevice":
        return "Subscribe on this device";
      case "NotSubscribed":
      default:
        return "Subscribe";
    }
  };

  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile && subscriptionStatus === "NotSubscribed") {
      const lastToastTime = localStorage.getItem("lastNotificationToastTime");
      const currentTime = new Date().getTime();
      const oneWeek = 7 * 24 * 60 * 60 * 1000; // One week in milliseconds

      if (!lastToastTime || currentTime - parseInt(lastToastTime) > oneWeek) {
        toast.message("Enable notifications", {
          description: "Stay updated with your course notifications",
          action: {
            label: "Subscribe",
            onClick: handleSubscribeClick,
          },
        });
        localStorage.setItem("lastNotificationToastTime", currentTime.toString());
      }
    }
  }, [isMobile, subscriptionStatus, handleSubscribeClick]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-accent/50 w-9 h-9"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="-top-1 -right-1 absolute flex justify-center items-center bg-red-500 rounded-full w-4 h-4 font-medium text-[10px] text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0 rounded-lg w-[95vw] max-w-[440px] sm:w-[440px]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="flex flex-wrap gap-2 justify-between items-center px-4 py-1 border-b">
            <TabsList className="bg-transparent p-0">
              <TabsTrigger value="all">
                <Bell className="mr-2 w-4 h-4" />
                All
              </TabsTrigger>
              <TabsTrigger value="unread">
                <EyeOff className="mr-2 w-4 h-4" />
                Unread{" "}
                {unreadCount > 0 && (
                  <span className="bg-primary/10 ml-1 px-2 py-0.5 rounded-full text-primary text-xs">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSubscribeClick}
                disabled={isSubscribing}
                className="flex items-center gap-1.5 px-1 h-8 text-muted-foreground hover:text-primary text-xs"
              >
                {isSubscribing ? (
                  <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                ) : subscriptionStatus === "SubscribedOnThisDevice" ? (
                  <BellOff className="w-3.5 h-3.5" />
                ) : (
                  <Bell className="w-3.5 h-3.5" />
                )}
                <span>{getSubscriptionButtonText()}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => void refetchNotifications()}
                disabled={isRefetchingNotifications}
              >
                <RefreshCcw
                  className={cn("h-4 w-4", isRefetchingNotifications ? "animate-spin" : undefined)}
                />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8">
                    <Filter className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {filterCategories.map(({ type, label }) => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={selectedCategories.includes(type as NotificationEventTypes)}
                      onCheckedChange={(checked) => {
                        setSelectedCategories(
                          checked
                            ? [...selectedCategories, type as NotificationEventTypes]
                            : selectedCategories.filter((t) => t !== type)
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

          {["all", "unread"].map((tab) => (
            <TabsContent key={tab} value={tab} className="m-0">
              {selectedCategories.length > 0 && (
                <div className="flex justify-between items-center px-4 py-1 border-b overflow-x-auto">
                  <div className="flex items-center gap-1.5">
                    {selectedCategories.map((category) => (
                      <div
                        key={category}
                        className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full text-primary text-xs"
                      >
                        {filterCategories.find((f) => f.type === category)?.label}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-primary/20 p-0.5 w-4 h-4"
                          onClick={() =>
                            setSelectedCategories(selectedCategories.filter((t) => t !== category))
                          }
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 text-muted-foreground hover:text-primary text-xs"
                    onClick={() => setSelectedCategories([])}
                  >
                    Clear all
                  </Button>
                </div>
              )}

              <div className="h-[370px] overflow-y-auto">
                <div className="space-y-1 py-2">
                  {filteredNotifications
                    .filter((n: Notification) => (tab === "all" ? true : !n.readAt))
                    .map((notification: Notification) => {
                      const config =
                        NOTIFICATION_TYPES[notification.eventType] || DEFAULT_NOTIFICATION_CONFIG;
                      return (
                        <div
                          key={notification.id}
                          className={cn(
                            "group flex items-center gap-4 px-4 py-3 hover:bg-accent/20",
                            getNotificationLink(notification) && "cursor-pointer"
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div
                            className={cn(
                              "rounded-full p-2 flex items-center justify-center h-fit",
                              config.bgColor,
                              notification.readAt && "opacity-50"
                            )}
                          >
                            <config.icon className={cn("h-5 w-5", config.color)} />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p
                              className={cn(
                                "text-sm leading-tight",
                                notification.readAt && "text-muted-foreground"
                              )}
                            >
                              {notification.message}
                            </p>
                            <p className="text-muted-foreground text-sm">
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
                                    toggleReadStatus({ id: notification.id });
                                  }}
                                  className="opacity-0 group-hover:opacity-100 w-8 h-8 transition-opacity"
                                >
                                  {notification.readAt ? (
                                    <MailOpen className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <Mail className="w-4 h-4 text-primary" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {notification.readAt ? "Mark as unread" : "Mark as read"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      );
                    })}
                </div>

                {filteredNotifications.filter((n: Notification) =>
                  tab === "all" ? true : !n.readAt
                ).length === 0 && (
                    <div className="flex justify-center items-center h-full">
                      <div className="flex flex-col items-center gap-2">
                        <Eye className="w-8 h-8 text-muted-foreground/50" />
                        <span className="text-muted-foreground text-sm">
                          {selectedCategories.length > 0
                            ? "No notifications in selected categories"
                            : tab === "unread"
                              ? "No unread notifications"
                              : "No notifications"}
                        </span>
                      </div>
                    </div>
                  )}
              </div>

              <div className="bg-background border-t h-12">
                <Button
                  variant="ghost"
                  className="justify-center hover:bg-accent/50 w-full h-full text-muted-foreground hover:text-primary"
                  onClick={() => markAllAsRead()}
                >
                  Mark All as Read
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
