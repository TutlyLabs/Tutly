"use client";

import { MessageCircle } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { UserLink } from "@/components/UserLink";

import DisplayTable, { type Column } from "@/components/table/DisplayTable";
import { Avatar, AvatarFallback, AvatarImage } from "@tutly/ui/avatar";
import { Badge } from "@tutly/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tutly/ui/tooltip";
import { cn } from "@tutly/utils";
import day from "@tutly/utils/dayjs";
import { api } from "@/trpc/react";

interface UserCardsProps {
  data: Record<string, any>[];
  totalItems: number;
  activeCount: number;
  neverSeenCount: number;
  last1hCount: number;
  last24hCount: number;
  last7dCount: number;
  isRefetching?: boolean;
}

const renderOnlineStatus = ({ lastSeen }: { lastSeen: Date | null }) => {
  if (!lastSeen) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={50}>
          <TooltipTrigger asChild>
            <div className="ring-background absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 ring-2" />
          </TooltipTrigger>
          <TooltipContent side="top" align="center" sideOffset={5}>
            <p>Never logged in</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const now = day();
  const lastSeenTime = day(lastSeen);
  const diffInMinutes = now.diff(lastSeenTime, "minute");
  const isOnline = diffInMinutes < 2;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={50}>
        <TooltipTrigger asChild>
          <div
            className={`ring-background absolute top-0 right-0 h-3 w-3 rounded-full ring-2 ${isOnline ? "animate-pulse bg-green-500" : "bg-gray-500"}`}
          />
        </TooltipTrigger>
        <TooltipContent side="top" align="center" sideOffset={5}>
          <p>
            {isOnline
              ? "User is currently online!"
              : `Last seen ${lastSeenTime.fromNow()}`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const columns: Column[] = [
  {
    key: "name",
    name: "Name",
    label: "Name",
    type: "text",
    sortable: true,
    filterable: true,
    validation: {
      required: true,
      regex: /^[A-Za-z0-9\s]{2,50}$/,
      message: "Name must be 2-50 characters, letters and numbers only",
    },
    render: (_, row) => (
      <UserLink
        username={row.username}
        className="flex items-center gap-4 transition-opacity hover:opacity-80"
      >
        <div className="relative">
          <Avatar className="ring-primary/20 h-10 w-10 ring-2">
            <AvatarImage
              src={row.image ?? "/placeholder.jpg"}
              alt={row.name ?? ""}
            />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {row.name
                ?.split(" ")
                .map((n: string) => n[0])
                .join("") ?? row.username?.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          {renderOnlineStatus({ lastSeen: row.lastSeen })}
        </div>
        <div>
          <div className="font-medium">{row.name ?? row.username}</div>
          <div className="text-muted-foreground text-sm">{row.username}</div>
        </div>
      </UserLink>
    ),
  },
  {
    key: "role",
    name: "Role",
    label: "Role",
    type: "select",
    options: [
      { label: "Student", value: "STUDENT" },
      { label: "Mentor", value: "MENTOR" },
    ],
    sortable: true,
    filterable: true,
  },
  {
    key: "email",
    name: "Email",
    label: "Email",
    type: "email",
    sortable: true,
    filterable: true,
    validation: {
      required: true,
      regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Must be a valid email address",
    },
  },
  {
    key: "lastSeen",
    name: "Status",
    label: "Status",
    type: "text",
    sortable: true,
    filterable: true,
    render: (_, row) => {
      const now = day();
      const lastSeenTime = row.lastSeen ? day(row.lastSeen) : null;
      const diffInMinutes = lastSeenTime
        ? now.diff(lastSeenTime, "minute")
        : null;
      const isOnline = diffInMinutes !== null && diffInMinutes < 2;

      return (
        <span className="text-muted-foreground text-sm">
          {!lastSeenTime
            ? "Never logged in"
            : isOnline
              ? "Online"
              : lastSeenTime.fromNow()}
        </span>
      );
    },
  },
  {
    key: "mentorUsername",
    name: "Assigned Mentor",
    label: "Assigned Mentor",
    type: "text",
    sortable: true,
    filterable: true,
  },
];

const gridViewRender = (data: Record<string, any>[]) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {data.map((user) => {
      const now = day();
      const lastSeenTime = user.lastSeen ? day(user.lastSeen) : null;
      const diffInMinutes = lastSeenTime
        ? now.diff(lastSeenTime, "minute")
        : null;
      const isOnline = diffInMinutes !== null && diffInMinutes < 2;
      const statusLabel = isOnline
        ? "Online now"
        : lastSeenTime
          ? `Last seen ${lastSeenTime.fromNow()}`
          : "Never logged in";
      return (
        <div
          key={user.id}
          className="group bg-card hover:border-primary/30 relative flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-all hover:shadow-md"
        >
          <div className="absolute top-3 right-3">{user.__actions}</div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="ring-border h-11 w-11 ring-1">
                <AvatarImage
                  src={user.image ?? "/placeholder.jpg"}
                  alt={user.name ?? ""}
                />
                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                  {user.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("") ?? user.username?.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div
                className={`ring-card absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full ring-2 ${
                  isOnline
                    ? "animate-pulse bg-emerald-500"
                    : lastSeenTime
                      ? "bg-muted-foreground/40"
                      : "bg-rose-500"
                }`}
              />
            </div>
            <UserLink
              username={user.username}
              className="min-w-0 flex-1 transition-opacity hover:opacity-80"
            >
              <h3 className="text-foreground truncate text-sm font-semibold hover:underline">
                {user.name ?? user.username}
              </h3>
              <p className="text-muted-foreground truncate text-xs">
                @{user.username}
              </p>
            </UserLink>
            <Badge
              variant="outline"
              className="shrink-0 text-[10px] font-medium tracking-wide uppercase"
            >
              {user.role}
            </Badge>
          </div>
          <div className="text-muted-foreground border-border space-y-1 border-t pt-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span>Status</span>
              <span
                className={`truncate font-medium ${
                  isOnline
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-foreground"
                }`}
              >
                {statusLabel}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Email</span>
              <span className="text-foreground truncate">{user.email}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Mobile</span>
              <span className="text-foreground">{user.mobile ?? "—"}</span>
            </div>
            {user.mentorUsername && (
              <div className="flex items-center justify-between gap-2">
                <span>Mentor</span>
                <UserLink
                  username={user.mentorUsername}
                  target="_blank"
                  className="text-primary truncate font-medium"
                >
                  @{user.mentorUsername}
                </UserLink>
              </div>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

const UserCards = ({
  data,
  totalItems,
  activeCount,
  neverSeenCount,
  last1hCount,
  last24hCount,
  last7dCount,
  isRefetching = false,
}: UserCardsProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPreset = searchParams.get("lastSeen") ?? "all";

  const setPreset = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("lastSeen");
    else params.set("lastSeen", value);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const presets: {
    value: string;
    label: string;
    count: number;
    tone: string;
  }[] = [
    { value: "all", label: "All", count: totalItems, tone: "" },
    {
      value: "online",
      label: "Online",
      count: activeCount,
      tone: "data-[active=true]:bg-emerald-500 data-[active=true]:text-white",
    },
    {
      value: "1h",
      label: "Last hour",
      count: last1hCount,
      tone: "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground",
    },
    {
      value: "24h",
      label: "Last 24h",
      count: last24hCount,
      tone: "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground",
    },
    {
      value: "7d",
      label: "Last 7d",
      count: last7dCount,
      tone: "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground",
    },
    {
      value: "stale-24h",
      label: "Idle 24h+",
      count: Math.max(0, totalItems - last24hCount - neverSeenCount),
      tone: "data-[active=true]:bg-amber-500 data-[active=true]:text-white",
    },
    {
      value: "never",
      label: "Never logged in",
      count: neverSeenCount,
      tone: "data-[active=true]:bg-rose-500 data-[active=true]:text-white",
    },
  ];

  const createDM = api.chat.createOrGetDM.useMutation({
    onSuccess: ({ groupId }) => router.push(`/community?g=${groupId}`),
    onError: () => toast.error("Could not start conversation"),
  });

  const sortedData = [...data].sort((a, b) => {
    const now = day();
    const aLastSeen = a.lastSeen ? day(a.lastSeen) : null;
    const bLastSeen = b.lastSeen ? day(b.lastSeen) : null;

    const aDiffMinutes = aLastSeen ? now.diff(aLastSeen, "minute") : null;
    const bDiffMinutes = bLastSeen ? now.diff(bLastSeen, "minute") : null;
    const aIsOnline = aDiffMinutes !== null && aDiffMinutes < 2;
    const bIsOnline = bDiffMinutes !== null && bDiffMinutes < 2;

    if (aIsOnline && !bIsOnline) return -1;
    if (!aIsOnline && bIsOnline) return 1;
    if (aIsOnline && bIsOnline) return 0;

    if (aLastSeen && !bLastSeen) return -1;
    if (!aLastSeen && bLastSeen) return 1;
    if (!aLastSeen && !bLastSeen) return 0;

    return bLastSeen ? bLastSeen.diff(aLastSeen) : 0;
  });

  return (
    <div className="space-y-3">
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="bg-muted/40 inline-flex max-w-full items-center gap-1 rounded-full p-1">
          {presets.map((p) => {
            const active = currentPreset === p.value;
            return (
              <button
                key={p.value}
                type="button"
                data-active={active}
                onClick={() => setPreset(p.value)}
                className={cn(
                  "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors",
                  "text-foreground/70 hover:text-foreground",
                  "data-[active=true]:shadow-sm",
                  active && !p.tone && "bg-primary text-primary-foreground",
                  p.tone,
                )}
              >
                {p.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
                    active
                      ? "bg-black/15 text-white dark:bg-white/15"
                      : "bg-background/80 text-muted-foreground",
                  )}
                >
                  {p.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div
        className={cn(
          "transition-opacity",
          isRefetching && "pointer-events-none opacity-60",
        )}
      >
        <DisplayTable
          data={sortedData}
          columns={columns}
          defaultView="table"
          filterable={true}
          clientSideProcessing={false}
          totalItems={totalItems}
          defaultPageSize={10}
          gridViewRender={gridViewRender}
          title="Users Management"
          headerContent={
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Total · {totalItems}</Badge>
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              >
                Online · {activeCount}
              </Badge>
              <Badge variant="outline">Last 24h · {last24hCount}</Badge>
              <Badge variant="outline">Last 7d · {last7dCount}</Badge>
              {neverSeenCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                >
                  Never logged in · {neverSeenCount}
                </Badge>
              )}
            </div>
          }
          actions={[
            {
              label: "Message",
              icon: <MessageCircle className="mr-2 h-4 w-4" />,
              onClick: (user: any) => {
                if (!user?.id) return;
                createDM.mutate({ targetUserId: user.id });
              },
            },
          ]}
        />
      </div>
    </div>
  );
};

export default UserCards;
