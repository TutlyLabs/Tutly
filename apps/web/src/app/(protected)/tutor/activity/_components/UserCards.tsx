"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import DisplayTable, { type Column } from "@/components/table/DisplayTable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import day from "@/lib/dayjs";
import { api } from "@/trpc/react";

interface UserCardsProps {
  data: Record<string, any>[];
  totalItems: number;
  activeCount: number;
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
      <div className="flex items-center gap-4">
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
      </div>
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
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {data.map((user) => (
      <div
        key={user.id}
        className="group bg-card relative overflow-hidden rounded-lg border p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
      >
        {user.__actions}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="ring-primary/20 h-12 w-12 ring-2">
              <AvatarImage
                src={user.image ?? "/placeholder.jpg"}
                alt={user.name ?? ""}
              />
              <AvatarFallback className="bg-primary/20 text-primary">
                {user.name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("") ?? user.username?.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute top-0 right-0">
              {(() => {
                const now = day();
                const lastSeenTime = user.lastSeen ? day(user.lastSeen) : null;
                const diffInMinutes = lastSeenTime
                  ? now.diff(lastSeenTime, "minute")
                  : null;
                const isOnline = diffInMinutes !== null && diffInMinutes < 2;

                return (
                  <div
                    className={`ring-background h-3 w-3 rounded-full ring-2 ${isOnline ? "animate-pulse bg-green-500" : "bg-gray-500"}`}
                  />
                );
              })()}
            </div>
          </div>
          <div>
            <h3 className="font-semibold">{user.name ?? user.username}</h3>
            <p className="text-muted-foreground text-sm">{user.role}</p>
            <p className="text-muted-foreground text-xs">
              {(() => {
                const now = day();
                const lastSeenTime = user.lastSeen ? day(user.lastSeen) : null;
                const diffInMinutes = lastSeenTime
                  ? now.diff(lastSeenTime, "minute")
                  : null;
                const isOnline = diffInMinutes !== null && diffInMinutes < 2;

                return isOnline
                  ? "Online now"
                  : lastSeenTime
                    ? `Last seen ${lastSeenTime.fromNow()}`
                    : "Never logged in";
              })()}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-sm">
            <span className="font-medium">Email:</span> {user.email}
          </p>
          <p className="text-sm">
            <span className="font-medium">Mobile:</span> {user.mobile ?? "N/A"}
          </p>
          {user.mentorUsername && (
            <p className="text-sm">
              <span className="font-medium">Mentor:</span> {user.mentorUsername}
            </p>
          )}
        </div>
      </div>
    ))}
  </div>
);

const UserCards = ({ data, totalItems, activeCount }: UserCardsProps) => {
  const [selectedUser, setSelectedUser] = useState<Record<string, any> | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const notifyUserMutation = api.notifications.notifyUser.useMutation({
    onSuccess: () => {
      toast.success("Message sent successfully!");
      setMessage("");
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send message");
    },
  });

  const handleSendMessage = async () => {
    if (!selectedUser?.id) return;
    notifyUserMutation.mutate({
      userId: selectedUser.id,
      message,
    });
  };

  const sortedData = [...data].sort((a, b) => {
    const now = day();
    const aLastSeen = a.lastSeen ? day(a.lastSeen) : null;
    const bLastSeen = b.lastSeen ? day(b.lastSeen) : null;

    const aDiffMinutes = aLastSeen ? now.diff(aLastSeen, "minute") : null;
    const bDiffMinutes = bLastSeen ? now.diff(bLastSeen, "minute") : null;
    const aIsOnline = aDiffMinutes !== null && aDiffMinutes < 2;
    const bIsOnline = bDiffMinutes !== null && bDiffMinutes < 2;

    //  Online users
    if (aIsOnline && !bIsOnline) return -1;
    if (!aIsOnline && bIsOnline) return 1;
    if (aIsOnline && bIsOnline) return 0;

    // Users who have logged in before vs never logged in
    if (aLastSeen && !bLastSeen) return -1;
    if (!aLastSeen && bLastSeen) return 1;

    // If neither has logged in, maintain original order
    if (!aLastSeen && !bLastSeen) return 0;

    // Both have logged in before, sort by most recent
    return bLastSeen ? bLastSeen.diff(aLastSeen) : 0;
  });

  return (
    <>
      <DisplayTable
        data={sortedData}
        columns={columns}
        defaultView="grid"
        filterable={true}
        clientSideProcessing={false}
        totalItems={totalItems}
        defaultPageSize={10}
        gridViewRender={gridViewRender}
        title="Users Management"
        headerContent={
          <div className="flex gap-2">
            <Badge variant="secondary">Total: {totalItems}</Badge>
            <Badge variant="outline">Active: {activeCount}</Badge>
          </div>
        }
        actions={[
          {
            label: "Notify",
            icon: <Bell className="mr-2 h-4 w-4" />,
            onClick: (user: any) => {
              setSelectedUser(user);
              setIsOpen(true);
            },
          },
        ]}
      />

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setSelectedUser(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Send Message to {selectedUser?.name ?? selectedUser?.username}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Send a notification message to this user
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            className="min-h-[160px] resize-none text-base leading-relaxed"
          />
          <DialogFooter>
            <Button
              onClick={handleSendMessage}
              size="lg"
              className="w-full font-semibold"
            >
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserCards;
