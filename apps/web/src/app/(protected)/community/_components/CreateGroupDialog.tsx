"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import { Button } from "@tutly/ui/button";
import { Input } from "@tutly/ui/input";
import { Textarea } from "@tutly/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@tutly/ui/dialog";
import { api } from "@/trpc/react";
import { cn } from "@tutly/utils";
import Image from "next/image";

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}

export function CreateGroupDialog({
  open,
  onClose,
  onCreated,
}: CreateGroupDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<
    { id: string; name: string; username: string; image: string | null }[]
  >([]);

  const utils = api.useUtils();

  const { data: searchResults = [] } = api.chat.searchUsers.useQuery(
    { query: searchQ },
    { enabled: searchQ.length >= 2 },
  );

  const createGroup = api.chat.createGroup.useMutation({
    onSuccess: (group) => {
      toast.success("Group created!");
      void utils.chat.getMyGroups.invalidate();
      handleClose();
      onCreated?.(group.id);
    },
    onError: () => toast.error("Failed to create group"),
  });

  const handleClose = () => {
    setName("");
    setDescription("");
    setSearchQ("");
    setSelectedUsers([]);
    onClose();
  };

  const toggleUser = (user: (typeof selectedUsers)[0]) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u.id === user.id);
      return exists ? prev.filter((u) => u.id !== user.id) : [...prev, user];
    });
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error("Add at least one member");
      return;
    }
    createGroup.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      memberUserIds: selectedUsers.map((u) => u.id),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Group name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="resize-none"
          />

          {/* Selected users */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map((u) => (
                <span
                  key={u.id}
                  className="bg-primary/10 text-primary flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                >
                  {u.name.split(" ")[0]}
                  <button
                    onClick={() => toggleUser(u)}
                    className="hover:text-primary/60"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* User search */}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Search members to add…"
              className="pl-9"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
          </div>

          {searchResults.length > 0 && (
            <div className="max-h-44 overflow-y-auto rounded-lg border">
              {searchResults.map((user: any) => {
                const isSelected = selectedUsers.some((u) => u.id === user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      isSelected ? "bg-primary/10" : "hover:bg-accent",
                    )}
                  >
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name}
                        width={32}
                        height={32}
                        className="flex-shrink-0 rounded-full"
                      />
                    ) : (
                      <div className="bg-muted text-muted-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold">
                        {user.name[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-medium">
                        {user.name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        @{user.username}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="text-primary text-xs font-medium">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createGroup.isPending}>
            {createGroup.isPending ? "Creating…" : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
