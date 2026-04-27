"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Users,
  BookOpen,
  MessageSquare,
  UserPlus,
  User,
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { UserLink } from "@/components/UserLink";
import { Input } from "@tutly/ui/input";
import { Button } from "@tutly/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@tutly/ui/dialog";
import { cn } from "@tutly/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { CreateGroupDialog } from "./CreateGroupDialog";

interface GroupMember {
  userId: string;
  user: { id: string; name: string; username: string; image: string | null };
}

interface Group {
  id: string;
  name: string;
  type: string;
  image: string | null;
  course: { id: string; title: string; image: string | null } | null;
  messages: Array<{
    content: string;
    type: string;
    createdAt: Date;
    sender: { id: string; name: string };
  }>;
  members: Array<GroupMember>;
  memberRole: string;
  lastReadAt: Date | null;
  unreadCount: number;
}

interface GroupSidebarProps {
  groups: Group[];
  isLoading: boolean;
  activeGroupId: string | null;
  onSelect: (id: string) => void;
  currentUserId: string;
  onGroupCreated?: (id: string) => void;
}

export function GroupSidebar({
  groups,
  isLoading,
  activeGroupId,
  onSelect,
  currentUserId,
  onGroupCreated,
}: GroupSidebarProps) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [activeTab, setActiveTab] = useState<"chats" | "people">("chats");

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

  const courseGroups = filtered.filter((g) => g.type === "COURSE");
  const mentorGroups = filtered.filter((g) => g.type === "MENTOR");
  const dmGroups = filtered.filter((g) => g.type === "DIRECT");
  const customGroups = filtered.filter((g) => g.type === "CUSTOM");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-foreground text-lg font-semibold">Community</h2>
        <div className="flex items-center gap-1">
          {activeTab === "chats" && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setShowNewDM(true)}
                title="New direct message"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setShowCreate(true)}
                title="New group"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b px-3 pt-2">
        <button
          type="button"
          onClick={() => setActiveTab("chats")}
          className={cn(
            "flex-1 rounded-t-md pb-2 text-xs font-medium transition-colors",
            activeTab === "chats"
              ? "text-primary border-primary border-b-2"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Chats
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("people")}
          className={cn(
            "flex-1 rounded-t-md pb-2 text-xs font-medium transition-colors",
            activeTab === "people"
              ? "text-primary border-primary border-b-2"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          People
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5" />
          <Input
            placeholder={
              activeTab === "chats" ? "Search conversations…" : "Search people…"
            }
            className="h-8 pl-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Group list / People list */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "people" && (
          <PeopleList
            query={search}
            onDM={(groupId) => {
              setActiveTab("chats");
              onSelect(groupId);
              onGroupCreated?.(groupId);
            }}
            currentUserId={currentUserId}
          />
        )}
        {activeTab === "chats" && (
          <>
            {isLoading ? (
              <GroupListSkeleton />
            ) : (
              <>
                {courseGroups.length > 0 && (
                  <GroupSection
                    label="Course Channels"
                    icon={<BookOpen className="h-3 w-3" />}
                    groups={courseGroups}
                    activeGroupId={activeGroupId}
                    onSelect={onSelect}
                    currentUserId={currentUserId}
                  />
                )}
                {mentorGroups.length > 0 && (
                  <GroupSection
                    label="Mentor Cohorts"
                    icon={<Users className="h-3 w-3" />}
                    groups={mentorGroups}
                    activeGroupId={activeGroupId}
                    onSelect={onSelect}
                    currentUserId={currentUserId}
                  />
                )}
                {dmGroups.length > 0 && (
                  <GroupSection
                    label="Direct Messages"
                    icon={<MessageSquare className="h-3 w-3" />}
                    groups={dmGroups}
                    activeGroupId={activeGroupId}
                    onSelect={onSelect}
                    currentUserId={currentUserId}
                  />
                )}
                {customGroups.length > 0 && (
                  <GroupSection
                    label="Groups"
                    icon={<Users className="h-3 w-3" />}
                    groups={customGroups}
                    activeGroupId={activeGroupId}
                    onSelect={onSelect}
                    currentUserId={currentUserId}
                  />
                )}
                {filtered.length === 0 && (
                  <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                    <MessageSquare className="text-muted-foreground/40 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">
                      {search ? "No groups found" : "No conversations yet"}
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <CreateGroupDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(id) => {
          onSelect(id);
          onGroupCreated?.(id);
        }}
      />
      <NewDMDialog
        open={showNewDM}
        onClose={() => setShowNewDM(false)}
        onSelect={(id) => {
          onSelect(id);
          onGroupCreated?.(id);
        }}
      />
    </div>
  );
}

function GroupSection({
  label,
  icon,
  groups,
  activeGroupId,
  onSelect,
  currentUserId,
}: {
  label: string;
  icon: React.ReactNode;
  groups: Group[];
  activeGroupId: string | null;
  onSelect: (id: string) => void;
  currentUserId: string;
}) {
  return (
    <div className="py-1">
      <div className="text-muted-foreground flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-semibold tracking-wider uppercase">
        {icon}
        {label}
      </div>
      {groups.map((group) => (
        <GroupItem
          key={group.id}
          group={group}
          isActive={group.id === activeGroupId}
          onSelect={onSelect}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}

function GroupItem({
  group,
  isActive,
  onSelect,
  currentUserId,
}: {
  group: Group;
  isActive: boolean;
  onSelect: (id: string) => void;
  currentUserId: string;
}) {
  const lastMsg = group.messages[0];
  const isOwnLast = lastMsg?.sender.id === currentUserId;

  // For DM groups, show the other person's info
  const dmOther =
    group.type === "DIRECT"
      ? group.members.find((m) => m.userId !== currentUserId)?.user
      : null;

  const displayName = dmOther?.name ?? group.name;
  const avatar = dmOther?.image ?? group.image ?? group.course?.image;

  const hasUnread = !isActive && group.unreadCount > 0;

  return (
    <button
      onClick={() => onSelect(group.id)}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2.5 transition-colors",
        "hover:bg-accent/60",
        isActive && "bg-primary/10 hover:bg-primary/10",
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <GroupAvatar name={displayName} image={avatar} size={42} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-baseline justify-between gap-1">
          <span
            className={cn(
              "truncate text-sm",
              isActive
                ? "text-primary font-medium"
                : hasUnread
                  ? "text-foreground font-semibold"
                  : "text-foreground font-medium",
            )}
          >
            {displayName}
          </span>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            {lastMsg && (
              <span
                className={cn(
                  "text-[10px]",
                  hasUnread
                    ? "text-primary font-medium"
                    : "text-muted-foreground",
                )}
              >
                {formatDistanceToNow(new Date(lastMsg.createdAt), {
                  addSuffix: false,
                })}
              </span>
            )}
            {hasUnread && (
              <span className="bg-primary flex h-4 min-w-4 flex-shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
                {group.unreadCount > 99 ? "99+" : group.unreadCount}
              </span>
            )}
          </div>
        </div>
        {lastMsg && (
          <p
            className={cn(
              "truncate text-xs",
              hasUnread
                ? "text-foreground/80 font-medium"
                : "text-muted-foreground",
            )}
          >
            {lastMsg.type === "ACTIVITY" ? (
              <span className="italic">{lastMsg.content}</span>
            ) : (
              <>
                {isOwnLast ? "You: " : `${lastMsg.sender.name.split(" ")[0]}: `}
                {lastMsg.type === "IMAGE"
                  ? "📷 Photo"
                  : lastMsg.type === "FILE"
                    ? "📎 File"
                    : lastMsg.content}
              </>
            )}
          </p>
        )}
      </div>
    </button>
  );
}

export function GroupAvatar({
  name,
  image,
  size = 40,
}: {
  name: string;
  image?: string | null;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-pink-500",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];

  if (image && !imgError) {
    return (
      <img
        src={image}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="flex-shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white",
        color,
      )}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        fontSize: size * 0.35,
      }}
    >
      {initials}
    </div>
  );
}

function NewDMDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (groupId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const utils = api.useUtils();

  const { data: results = [] } = api.chat.searchUsers.useQuery(
    { query },
    { enabled: query.length >= 2 },
  );

  const createDM = api.chat.createOrGetDM.useMutation({
    onSuccess: async (data) => {
      await utils.chat.getMyGroups.invalidate();
      onSelect(data.groupId);
      onClose();
      setQuery("");
    },
    onError: () => toast.error("Could not open conversation"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setQuery("");
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Direct Message</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Search people…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="-mx-1 max-h-64 overflow-y-auto">
          {query.length < 2 && (
            <p className="text-muted-foreground px-1 py-6 text-center text-sm">
              Type a name or username to search
            </p>
          )}
          {query.length >= 2 && results.length === 0 && (
            <p className="text-muted-foreground px-1 py-6 text-center text-sm">
              No users found
            </p>
          )}
          {results.map((user: any) => (
            <button
              key={user.id}
              onClick={() => createDM.mutate({ targetUserId: user.id })}
              disabled={createDM.isPending}
              className="hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors disabled:opacity-50"
            >
              <UserAvatar src={user.image} name={user.name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-medium">
                  {user.name}
                </p>
                <p className="text-muted-foreground text-xs">
                  @{user.username}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const ROLE_COLORS: Record<string, string> = {
  INSTRUCTOR: "text-amber-600 bg-amber-100",
  MENTOR: "text-blue-600 bg-blue-100",
  STUDENT: "text-emerald-600 bg-emerald-100",
  ADMIN: "text-purple-600 bg-purple-100",
};

function PeopleList({
  query,
  onDM,
  currentUserId,
}: {
  query: string;
  onDM: (groupId: string) => void;
  currentUserId: string;
}) {
  const utils = api.useUtils();
  const { data: users = [], isLoading } = api.chat.searchUsers.useQuery(
    { query },
    { staleTime: 60000 },
  );

  const createDM = api.chat.createOrGetDM.useMutation({
    onSuccess: async (data) => {
      await utils.chat.getMyGroups.invalidate();
      onDM(data.groupId);
    },
    onError: () => toast.error("Could not start conversation"),
  });

  if (isLoading) return <GroupListSkeleton />;

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <User className="text-muted-foreground/40 h-8 w-8" />
        <p className="text-muted-foreground text-sm">
          {query ? "No people found" : "No members yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {users.map((u: any) => (
        <div
          key={u.id}
          className="hover:bg-accent/50 group/person flex items-center gap-3 px-3 py-2 transition-colors"
        >
          <UserLink
            username={u.username}
            className="flex min-w-0 flex-1 items-center gap-3 no-underline"
          >
            <UserAvatar src={u.image} name={u.name} size={36} />
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm font-medium">
                {u.name}
              </p>
              <p className="text-muted-foreground text-xs">@{u.username}</p>
            </div>
          </UserLink>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                ROLE_COLORS[u.role] ?? "text-muted-foreground bg-muted",
              )}
            >
              {u.role.charAt(0) + u.role.slice(1).toLowerCase()}
            </span>
            {u.id !== currentUserId && (
              <button
                type="button"
                onClick={() => createDM.mutate({ targetUserId: u.id })}
                disabled={createDM.isPending}
                className="text-muted-foreground hover:text-primary opacity-0 transition-all group-hover/person:opacity-100"
                title="Send message"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg p-2.5">
          <div className="bg-muted h-10 w-10 flex-shrink-0 animate-pulse rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="bg-muted h-3.5 w-24 animate-pulse rounded" />
            <div className="bg-muted h-3 w-36 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
