"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import {
  Crown,
  MessageCircle,
  MoreHorizontal,
  Reply,
  Send,
  Trash2,
  X,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@tutly/ui/alert-dialog";
import { Button } from "@tutly/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@tutly/ui/dropdown-menu";
import { Input } from "@tutly/ui/input";
import { api } from "@/trpc/react";
import { useClientSession } from "@/lib/auth/client";
import { cn } from "@tutly/utils";

interface Doubt {
  id: string;
  description: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    role: string;
    image?: string;
  };
  response: Response[];
}

interface Response {
  id: string;
  description: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    role: string;
    image?: string;
  };
}

interface MessagesProps {
  doubts: Doubt[];
}

function UserAvatar({
  user,
  size = 36,
}: {
  user: { image?: string; role: string; name: string };
  size?: number;
}) {
  const ringClass =
    user.role === "INSTRUCTOR"
      ? "ring-rose-500/60"
      : user.role === "MENTOR"
        ? "ring-amber-400/70"
        : "ring-transparent";
  return (
    <div className="relative shrink-0">
      <Image
        src={user.image || "/placeholder.jpg"}
        alt={user.name}
        width={size}
        height={size}
        className={cn(
          "bg-muted h-9 w-9 rounded-full object-cover ring-2 ring-offset-1 ring-offset-card",
          ringClass,
        )}
      />
      {(user.role === "INSTRUCTOR" || user.role === "MENTOR") && (
        <span
          className={cn(
            "ring-card absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full text-[9px] ring-2",
            user.role === "INSTRUCTOR"
              ? "bg-rose-500 text-white"
              : "bg-amber-400 text-amber-950",
          )}
        >
          <Crown className="h-2.5 w-2.5" />
        </span>
      )}
    </div>
  );
}

function formatDateTime(dateTimeString: string) {
  const dateTime = new Date(dateTimeString);
  return dateTime.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Messages({ doubts }: MessagesProps) {
  const [openAccordion, setOpenAccordion] = useState<number>(0);
  const [reply, setReply] = useState<string>("");
  const [replyId, setReplyId] = useState<string>("");

  const { data, isPending } = useClientSession();
  const utils = api.useUtils();

  const createResponse = api.doubts.createResponse.useMutation({
    onSuccess: () => {
      void utils.doubts.getUserDoubtsByCourseId.invalidate();
      toast.success("Reply added");
      setReply("");
      setReplyId("");
    },
    onError: () => {
      toast.error("Failed to add reply");
    },
  });

  const deleteDoubt = api.doubts.deleteDoubt.useMutation({
    onSuccess: () => {
      void utils.doubts.getUserDoubtsByCourseId.invalidate();
      toast.success("Doubt deleted");
    },
    onError: () => {
      toast.error("Failed to delete doubt");
    },
  });

  const deleteResponse = api.doubts.deleteResponse.useMutation({
    onSuccess: () => {
      void utils.doubts.getUserDoubtsByCourseId.invalidate();
      toast.success("Reply deleted");
    },
    onError: () => {
      toast.error("Failed to delete reply");
    },
  });

  if (isPending) return null;
  const currentUser = data?.user!;

  const handleReply = async (id: string) => {
    if (!reply) return;
    await createResponse.mutateAsync({ doubtId: id, description: reply });
  };

  const handleDeleteDoubt = async (id: string) => {
    await deleteDoubt.mutateAsync({ doubtId: id });
  };

  const handleDeleteReply = async (rid: string) => {
    await deleteResponse.mutateAsync({ responseId: rid });
  };

  const toggleAccordion = (index: number) => {
    setOpenAccordion(openAccordion === index ? -1 : index);
  };

  if (!doubts?.length) return null;

  return (
    <div className="space-y-3">
      {doubts.map((qa, index) => {
        const isOpen = openAccordion === index;
        const canDelete =
          currentUser.role === "INSTRUCTOR" ||
          (currentUser.role === "MENTOR" && qa.user.id === currentUser.id);
        return (
          <div
            key={qa.id}
            className="bg-card overflow-hidden rounded-xl border shadow-sm"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 px-4 pt-4">
              <div className="flex min-w-0 items-start gap-3">
                <UserAvatar user={qa.user} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="text-foreground truncate text-sm font-medium">
                      {qa.user.name}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      @{qa.user.username}
                    </p>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    {formatDateTime(qa.createdAt)}
                  </p>
                </div>
              </div>
              <AlertDialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-accent h-8 w-8 cursor-pointer"
                      aria-label="Doubt options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      onSelect={() => setReplyId(qa.id)}
                      className="cursor-pointer"
                    >
                      <Reply className="mr-2 h-4 w-4" />
                      Reply
                    </DropdownMenuItem>
                    {canDelete && (
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className="text-destructive cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this doubt?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteDoubt(qa.id)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Body */}
            <p className="text-foreground px-4 pt-2 pb-3 text-sm leading-relaxed">
              {qa.description}
            </p>

            {/* Replies summary */}
            <button
              type="button"
              onClick={() => toggleAccordion(index)}
              className="text-muted-foreground hover:bg-accent/40 flex w-full cursor-pointer items-center gap-2 border-t px-4 py-2.5 text-xs font-medium transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {qa.response.length}{" "}
              {qa.response.length === 1 ? "reply" : "replies"}
              <span className="ml-auto text-[11px]">
                {isOpen ? "Hide" : "Show"}
              </span>
            </button>

            {/* Reply composer */}
            {replyId === qa.id && (
              <div className="bg-muted/30 flex items-center gap-2 border-t px-3 py-2.5">
                <Input
                  placeholder="Write a reply…"
                  value={reply}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleReply(qa.id);
                    if (e.key === "Escape") setReplyId("");
                  }}
                  onChange={(e) => setReply(e.target.value)}
                  className="bg-background h-9 flex-1 text-sm"
                />
                <Button
                  onClick={() => setReplyId("")}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 cursor-pointer"
                  aria-label="Cancel reply"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => void handleReply(qa.id)}
                  size="icon"
                  className="h-9 w-9 cursor-pointer"
                  aria-label="Send reply"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Replies list */}
            {isOpen && qa.response.length > 0 && (
              <ul className="divide-border bg-background/40 divide-y border-t">
                {qa.response.map((r) => {
                  const canDeleteReply =
                    currentUser.role === "INSTRUCTOR" ||
                    currentUser.role === "MENTOR";
                  const hideForLowerRole =
                    r.user.role === "INSTRUCTOR" &&
                    currentUser.role !== "INSTRUCTOR";
                  return (
                    <li key={r.id} className="flex gap-3 px-4 py-3">
                      <UserAvatar user={r.user} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <p className="text-foreground text-sm font-medium">
                              {r.user.name}
                            </p>
                            <p className="text-muted-foreground text-[11px]">
                              @{r.user.username}
                            </p>
                          </div>
                          <p className="text-muted-foreground text-[11px]">
                            {formatDateTime(r.createdAt)}
                          </p>
                        </div>
                        <p className="text-foreground/90 mt-1 text-sm leading-relaxed">
                          {r.description}
                        </p>
                      </div>
                      {canDeleteReply && !hideForLowerRole && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0 cursor-pointer"
                              aria-label="Delete reply"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete reply?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteReply(r.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
