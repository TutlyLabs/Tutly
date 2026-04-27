"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@tutly/ui/sheet";
import { Input } from "@tutly/ui/input";
import { Button } from "@tutly/ui/button";
import { api } from "@/trpc/react";
import {
  Crown,
  UserPlus,
  Search,
  X,
  Check,
  LogOut,
  Pencil,
  Save,
} from "lucide-react";
import { Textarea } from "@tutly/ui/textarea";
import { cn } from "@tutly/utils";
import { toast } from "sonner";
import { GroupAvatar } from "./GroupSidebar";
import { UserAvatar } from "@/components/UserAvatar";
import { UserLink } from "@/components/UserLink";

const ROLE_BADGE: Record<string, string> = {
  INSTRUCTOR: "bg-amber-100 text-amber-700",
  MENTOR: "bg-blue-100 text-blue-700",
  STUDENT: "bg-green-100 text-green-700",
};

export function GroupInfoSheet({
  groupId,
  open,
  onClose,
  currentUserId,
}: {
  groupId: string;
  open: boolean;
  onClose: () => void;
  currentUserId: string;
}) {
  const utils = api.useUtils();
  const { data: group, refetch } = api.chat.getGroupInfo.useQuery(
    { groupId },
    { enabled: open },
  );

  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const { data: searchResults = [] } = api.chat.searchUsers.useQuery(
    { query: searchQuery, excludeGroupId: groupId },
    { enabled: searchQuery.length >= 2 },
  );

  const addMembers = api.chat.addMembers.useMutation({
    onSuccess: ({ added }) => {
      toast.success(`Added ${added} member${added !== 1 ? "s" : ""}`);
      setShowAddMembers(false);
      setSearchQuery("");
      setSelectedIds([]);
      void refetch();
      void utils.chat.getMyGroups.invalidate();
    },
    onError: () => toast.error("Failed to add members"),
  });

  const updateGroup = api.chat.updateGroup.useMutation({
    onSuccess: () => {
      toast.success("Group updated");
      setIsEditingGroup(false);
      void refetch();
      void utils.chat.getMyGroups.invalidate();
    },
    onError: () => toast.error("Failed to update group"),
  });

  const leaveGroup = api.chat.leaveGroup.useMutation({
    onSuccess: () => {
      toast.success("Left group");
      onClose();
      void utils.chat.getMyGroups.invalidate();
    },
    onError: (e) => toast.error(e.message ?? "Failed to leave group"),
  });

  const removeMember = api.chat.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      void refetch();
      void utils.chat.getMyGroups.invalidate();
    },
    onError: () => toast.error("Failed to remove member"),
  });

  if (!group) return null;

  const isDM = group.type === "DIRECT";
  const dmOther = isDM
    ? group.members.find((m: any) => m.userId !== currentUserId)
    : null;

  const isAdmin = group.members.some(
    (m: any) => m.userId === currentUserId && m.role === "ADMIN",
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:w-80">
        <SheetHeader className="pb-4 text-left">
          <SheetTitle>{isDM ? "Direct Message" : "Group Info"}</SheetTitle>
        </SheetHeader>

        {isDM && dmOther ? (
          <UserLink
            username={dmOther.user.username}
            className="hover:bg-accent/50 flex flex-col items-center gap-3 rounded-xl py-6 no-underline transition-colors"
          >
            <GroupAvatar
              name={dmOther.user.name}
              image={dmOther.user.image}
              size={80}
            />
            <div className="text-center">
              <h3 className="text-foreground text-lg font-semibold">
                {dmOther.user.name}
              </h3>
              <p className="text-muted-foreground text-sm">
                @{dmOther.user.username}
              </p>
              <span className="text-primary mt-1 inline-block text-xs hover:underline">
                View profile →
              </span>
            </div>
          </UserLink>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <GroupAvatar name={group.name} image={group.image} size={72} />
            {isEditingGroup ? (
              <div className="w-full space-y-2 px-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Group name"
                  className="h-8 text-center text-sm"
                  maxLength={100}
                />
                <Textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="resize-none text-sm"
                  rows={2}
                  maxLength={300}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-8 flex-1 gap-1.5 text-xs"
                    disabled={!editName.trim() || updateGroup.isPending}
                    onClick={() =>
                      updateGroup.mutate({
                        groupId,
                        name: editName.trim(),
                        description: editDesc.trim(),
                      })
                    }
                  >
                    <Save className="h-3.5 w-3.5" />
                    {updateGroup.isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => setIsEditingGroup(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <h3 className="text-foreground text-lg font-semibold">
                    {group.name}
                  </h3>
                  {isAdmin && group.type === "CUSTOM" && (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        setEditName(group.name);
                        setEditDesc(group.description ?? "");
                        setIsEditingGroup(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {group.description && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {group.description}
                  </p>
                )}
                <p className="text-muted-foreground mt-1 text-xs">
                  {group.members.length} members
                </p>
              </div>
            )}
          </div>
        )}

        {/* Posting policy (admin-only) */}
        {!isDM && isAdmin && (
          <div className="mt-2 mb-3 rounded-lg border p-3">
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
              Who can post
            </p>
            <PostingPolicyToggle
              groupId={groupId}
              current={(group as any).postingPolicy ?? "EVERYONE"}
              onChange={() => void refetch()}
            />
          </div>
        )}

        {/* Members list (for non-DM groups) */}
        {!isDM && (
          <div className="mt-2 space-y-1">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Members
              </p>
              {isAdmin && !showAddMembers && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setShowAddMembers(true)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add
                </Button>
              )}
            </div>

            {/* Add members panel */}
            {showAddMembers && (
              <div className="bg-accent/20 mb-3 space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-foreground text-xs font-medium">
                    Add members
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setShowAddMembers(false);
                      setSearchQuery("");
                      setSelectedIds([]);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5" />
                  <Input
                    autoFocus
                    placeholder="Search by name or username…"
                    className="h-8 pl-8 text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {searchResults.length > 0 && (
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {searchResults.map((u: any) => {
                      const selected = selectedIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleSelect(u.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                            selected ? "bg-primary/10" : "hover:bg-accent/50",
                          )}
                        >
                          <UserAvatar src={u.image} name={u.name} size={28} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">
                              {u.name}
                            </p>
                            <p className="text-muted-foreground truncate text-[10px]">
                              @{u.username}
                            </p>
                          </div>
                          {selected && (
                            <Check className="text-primary h-3.5 w-3.5 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-muted-foreground py-2 text-center text-xs">
                    No users found
                  </p>
                )}

                {selectedIds.length > 0 && (
                  <Button
                    size="sm"
                    className="h-8 w-full text-xs"
                    disabled={addMembers.isPending}
                    onClick={() =>
                      addMembers.mutate({ groupId, userIds: selectedIds })
                    }
                  >
                    {addMembers.isPending
                      ? "Adding…"
                      : `Add ${selectedIds.length} member${selectedIds.length !== 1 ? "s" : ""}`}
                  </Button>
                )}
              </div>
            )}

            {group.members.map((m: any) => (
              <MemberRow
                key={m.userId}
                member={m}
                isCurrentUser={m.userId === currentUserId}
                canRemove={
                  isAdmin &&
                  group.type === "CUSTOM" &&
                  m.userId !== currentUserId
                }
                onRemove={() => {
                  if (confirm(`Remove ${m.user.name} from the group?`)) {
                    removeMember.mutate({ groupId, targetUserId: m.userId });
                  }
                }}
              />
            ))}

            {/* Leave group button — only for CUSTOM groups */}
            {group.type === "CUSTOM" && (
              <div className="mt-4 border-t pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full gap-2"
                  disabled={leaveGroup.isPending}
                  onClick={() => {
                    if (confirm("Leave this group?"))
                      leaveGroup.mutate({ groupId });
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  {leaveGroup.isPending ? "Leaving…" : "Leave Group"}
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MemberRow({
  member,
  isCurrentUser,
  canRemove,
  onRemove,
}: {
  member: any;
  isCurrentUser: boolean;
  canRemove?: boolean;
  onRemove?: () => void;
}) {
  const user = member.user;
  const roleLabel = user.role.charAt(0) + user.role.slice(1).toLowerCase();

  return (
    <div className="group hover:bg-accent/50 flex items-center gap-3 rounded-lg p-2 transition-colors">
      <UserLink
        username={user.username}
        className="flex min-w-0 flex-1 items-center gap-3 no-underline"
      >
        <UserAvatar src={user.image} name={user.name} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-medium hover:underline">
            {user.name}
            {isCurrentUser && (
              <span className="text-muted-foreground font-normal"> (You)</span>
            )}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            @{user.username}
          </p>
        </div>
      </UserLink>
      <span
        className={cn(
          "flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
          ROLE_BADGE[user.role] ?? "bg-muted text-muted-foreground",
        )}
      >
        {roleLabel}
      </span>
      {member.role === "ADMIN" && (
        <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
      )}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive flex-shrink-0 opacity-0 transition-all group-hover:opacity-100"
          title="Remove from group"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function PostingPolicyToggle({
  groupId,
  current,
  onChange,
}: {
  groupId: string;
  current: "EVERYONE" | "ADMINS_ONLY";
  onChange: () => void;
}) {
  const [policy, setPolicy] = useState(current);
  const updatePolicy = api.chat.updatePostingPolicy.useMutation({
    onSuccess: () => {
      toast.success("Posting policy updated");
      onChange();
    },
    onError: () => {
      toast.error("Failed to update");
      setPolicy(current);
    },
  });

  const apply = (next: "EVERYONE" | "ADMINS_ONLY") => {
    setPolicy(next);
    updatePolicy.mutate({ groupId, postingPolicy: next });
  };

  const options: Array<{
    value: "EVERYONE" | "ADMINS_ONLY";
    label: string;
    hint: string;
  }> = [
    {
      value: "EVERYONE",
      label: "All members",
      hint: "Anyone in the group can post",
    },
    {
      value: "ADMINS_ONLY",
      label: "Admins only",
      hint: "Instructors and mentors only",
    },
  ];

  return (
    <div className="space-y-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={updatePolicy.isPending}
          onClick={() => apply(o.value)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors disabled:opacity-60",
            policy === o.value
              ? "border-primary bg-primary/5"
              : "hover:bg-accent/40",
          )}
        >
          <div>
            <p className="text-foreground text-xs font-medium">{o.label}</p>
            <p className="text-muted-foreground text-[10px]">{o.hint}</p>
          </div>
          {policy === o.value && (
            <Check className="text-primary h-3.5 w-3.5 flex-shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}
