"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Info,
  Smile,
  Send,
  Reply,
  X,
  Trash2,
  CornerDownLeft,
  ChevronUp,
  Search,
  Paperclip,
  FileIcon,
  Pin,
  PinOff,
  ZoomIn,
  Copy,
  Check as CheckIcon,
} from "lucide-react";
import { Button } from "@tutly/ui/button";
import { Textarea } from "@tutly/ui/textarea";
import { Input } from "@tutly/ui/input";
import { Dialog, DialogContent } from "@tutly/ui/dialog";
import { api } from "@/trpc/react";
import { cn } from "@tutly/utils";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { toast } from "sonner";
import { GroupAvatar } from "./GroupSidebar";
import { GroupInfoSheet } from "./GroupInfoSheet";
import { UserAvatar } from "@/components/UserAvatar";
import { UserLink } from "@/components/UserLink";
import { useFileUpload } from "@/components/useFileUpload";
import { FileType } from "@tutly/db/browser";

const POLL_MS = 3000;
const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface User {
  id: string;
  name: string;
  username: string;
  image?: string | null;
  role?: string;
}

interface Group {
  id: string;
  name: string;
  type: string;
  image: string | null;
  memberRole?: string;
  members: Array<{
    userId: string;
    user?: { id: string; name: string; username: string; image: string | null };
  }>;
}

interface Message {
  id: string;
  content: string;
  type: string;
  isPinned: boolean;
  senderId: string;
  createdAt: Date;
  deletedAt: Date | null;
  metadata: any;
  sender: { id: string; name: string; username: string; image: string | null };
  replyTo: { id: string; content: string; sender: { name: string } } | null;
  reactions: Array<{
    id: string;
    emoji: string;
    userId: string;
    user: { id: string; name: string };
  }>;
}

export function ChatView({
  group,
  currentUser,
  onBack,
}: {
  group: Group;
  currentUser: User;
  onBack: () => void;
}) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sinceDate, setSinceDate] = useState(() => new Date());
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showPinned, setShowPinned] = useState(false);

  const postingPolicy = (group as any).postingPolicy ?? "EVERYONE";
  const canPost = postingPolicy === "EVERYONE" || group.memberRole === "ADMIN";

  const jumpToMessage = useCallback((id: string) => {
    const el = scrollAreaRef.current?.querySelector(
      `[data-message-id="${id}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement).classList.add("bg-primary/10");
      setTimeout(
        () => (el as HTMLElement).classList.remove("bg-primary/10"),
        1500,
      );
    }
  }, []);
  const mentionStartRef = useRef<number>(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);
  const utils = api.useUtils();

  // Compute mention suggestions from group members
  const mentionCandidates =
    mentionQuery !== null
      ? group.members
          .filter(
            (m): m is typeof m & { user: NonNullable<typeof m.user> } =>
              !!m.user && m.userId !== currentUser.id,
          )
          .map((m) => m.user)
          .filter(
            (u) =>
              u.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
              u.name.toLowerCase().includes(mentionQuery.toLowerCase()),
          )
          .slice(0, 6)
      : [];

  const { data: msgData, isLoading } = api.chat.getMessages.useQuery(
    { groupId: group.id },
    { staleTime: 0 },
  );

  const { data: olderData, isFetching: loadingOlder } =
    api.chat.getMessages.useQuery(
      { groupId: group.id, cursor },
      { enabled: !!cursor, staleTime: 60000 },
    );

  // Accumulate older messages when cursor loads
  useEffect(() => {
    if (olderData?.messages) {
      setOlderMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const fresh = olderData.messages.filter(
          (m: Message) => !existingIds.has(m.id),
        );
        return [...fresh, ...prev];
      });
    }
  }, [olderData]);

  // Reset state on group change
  useEffect(() => {
    setOlderMessages([]);
    setCursor(undefined);
    setShowPinned(false);
    setMentionQuery(null);
    setShowSearch(false);
    setSearchQuery("");
  }, [group.id]);

  const { data: newMsgs = [] } = api.chat.getNewMessages.useQuery(
    { groupId: group.id, since: sinceDate },
    { refetchInterval: POLL_MS, staleTime: 0 },
  );

  const send = api.chat.sendMessage.useMutation({
    onSuccess: () => {
      setSinceDate(new Date());
      void utils.chat.getMessages.invalidate({ groupId: group.id });
      void utils.chat.getMyGroups.invalidate();
    },
    onError: () => toast.error("Failed to send message"),
  });

  const del = api.chat.deleteMessage.useMutation({
    onSuccess: () =>
      void utils.chat.getMessages.invalidate({ groupId: group.id }),
  });

  const react = api.chat.toggleReaction.useMutation({
    onSuccess: () =>
      void utils.chat.getMessages.invalidate({ groupId: group.id }),
  });

  const pin = api.chat.togglePin.useMutation({
    onSuccess: () => {
      void utils.chat.getMessages.invalidate({ groupId: group.id });
      void utils.chat.getPinnedMessages.invalidate({ groupId: group.id });
    },
  });

  const { data: pinnedMessages = [] } = api.chat.getPinnedMessages.useQuery(
    { groupId: group.id },
    { staleTime: 30000 },
  );

  const markRead = api.chat.markRead.useMutation();

  const { uploadFile } = useFileUpload({
    fileType: FileType.ATTACHMENT,
    onUpload: async (file) => {
      if (!file?.publicUrl) return;
      const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
      await send.mutateAsync({
        groupId: group.id,
        content: file.publicUrl,
        type: isImage ? "IMAGE" : "FILE",
        metadata: { fileName: file.name },
        replyToId: replyTo?.id,
      });
      setReplyTo(null);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setIsUploadingFile(true);
    try {
      await uploadFile(file);
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Mark as read + reset scroll tracking when group changes
  useEffect(() => {
    isInitialLoad.current = true;
    markRead.mutate({ groupId: group.id });
  }, [group.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge older + initial + polled messages, deduplicated
  const baseMessages = msgData?.messages ?? [];
  const allMessages: Message[] = [
    ...olderMessages.filter(
      (om) => !baseMessages.some((m: Message) => m.id === om.id),
    ),
    ...baseMessages,
    ...newMsgs.filter(
      (nm: Message) => !baseMessages.some((m: Message) => m.id === nm.id),
    ),
  ].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const hasMore = !!(msgData?.nextCursor || (olderData?.nextCursor && cursor));
  const nextCursorForLoad = olderData?.nextCursor ?? msgData?.nextCursor;

  const searchTrimmed = searchQuery.trim().toLowerCase();
  const displayMessages = searchTrimmed
    ? allMessages.filter((m) => m.content.toLowerCase().includes(searchTrimmed))
    : allMessages;

  // Scroll to bottom: instant on initial load, smooth when near bottom for new messages
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    if (isInitialLoad.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      isInitialLoad.current = false;
    } else {
      const isNearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (isNearBottom)
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages.length]);

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content) return;
    setText("");
    setReplyTo(null);
    setMentionQuery(null);
    await send.mutateAsync({
      groupId: group.id,
      content,
      replyToId: replyTo?.id,
    });
  }, [text, group.id, replyTo, send]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    const pos = e.target.selectionStart ?? val.length;
    // Detect @mention: find last @ before cursor with no space after it
    const textUpToCursor = val.slice(0, pos);
    const match = textUpToCursor.match(/@(\w*)$/);
    if (match) {
      mentionStartRef.current = pos - match[0].length;
      setMentionQuery(match[1] ?? "");
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const applyMention = (user: { username: string; name: string }) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const before = text.slice(0, mentionStartRef.current);
    const after = text.slice(ta.selectionStart ?? text.length);
    const newText = `${before}@${user.username} ${after}`;
    setText(newText);
    setMentionQuery(null);
    setTimeout(() => {
      ta.focus();
      const newPos = before.length + user.username.length + 2;
      ta.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionQuery !== null && mentionCandidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, mentionCandidates.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        const candidate = mentionCandidates[mentionIndex];
        if (candidate) applyMention(candidate);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // For DM groups, show the other person's info
  const dmOther =
    group.type === "DIRECT"
      ? group.members.find((m) => m.userId !== currentUser.id)?.user
      : null;
  const headerName = dmOther?.name ?? group.name;
  const headerImage = dmOther?.image ?? group.image;
  const headerSub =
    group.type === "DIRECT"
      ? dmOther
        ? `@${dmOther.username}`
        : "Direct message"
      : `${group.members.length} members`;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-3 py-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:hidden"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {dmOther ? (
          <UserLink username={dmOther.username} className="no-underline">
            <GroupAvatar name={headerName} image={headerImage} size={36} />
          </UserLink>
        ) : (
          <GroupAvatar name={headerName} image={headerImage} size={36} />
        )}
        <div className="min-w-0 flex-1">
          {dmOther ? (
            <UserLink username={dmOther.username}>
              <p className="text-foreground truncate text-sm font-semibold">
                {headerName}
              </p>
              <p className="text-muted-foreground text-xs">{headerSub}</p>
            </UserLink>
          ) : (
            <>
              <p className="text-foreground truncate text-sm font-semibold">
                {headerName}
              </p>
              <p className="text-muted-foreground text-xs">{headerSub}</p>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", showSearch && "bg-accent")}
          onClick={() => {
            setShowSearch((s) => !s);
            setSearchQuery("");
          }}
          title="Search messages"
        >
          <Search className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowInfo(true)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {/* Pinned messages banner */}
      {pinnedMessages.length > 0 && !showSearch && (
        <>
          <button
            type="button"
            onClick={() => setShowPinned((v) => !v)}
            className="bg-primary/5 hover:bg-primary/10 flex w-full items-center gap-2 border-b px-4 py-2 text-left transition-colors"
          >
            <Pin className="text-primary h-3.5 w-3.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground/80 truncate text-xs">
                <span className="text-primary font-medium">Pinned:</span>{" "}
                {pinnedMessages[0]?.type === "IMAGE"
                  ? "📷 Photo"
                  : pinnedMessages[0]?.content}
              </p>
            </div>
            <span className="text-muted-foreground flex-shrink-0 text-[10px]">
              {pinnedMessages.length > 1
                ? `${pinnedMessages.length} pinned`
                : "pinned"}{" "}
              ›
            </span>
          </button>
          {showPinned && (
            <div className="bg-primary/5 divide-primary/10 max-h-48 divide-y overflow-y-auto border-b">
              {pinnedMessages.map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => {
                    setShowPinned(false);
                    jumpToMessage(pm.id);
                  }}
                  className="hover:bg-primary/10 flex w-full items-start gap-2 px-4 py-2 text-left transition-colors"
                >
                  <Pin className="text-primary mt-0.5 h-3 w-3 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground/70 text-[11px] font-medium">
                      {pm.sender.name}
                    </p>
                    <p className="text-foreground/80 truncate text-xs">
                      {pm.type === "IMAGE"
                        ? "📷 Photo"
                        : pm.type === "FILE"
                          ? "📎 File"
                          : pm.content}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5" />
            <Input
              autoFocus
              placeholder="Search messages…"
              className="h-8 pl-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchTrimmed && (
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              {displayMessages.length} result
              {displayMessages.length !== 1 ? "s" : ""}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => {
              setShowSearch(false);
              setSearchQuery("");
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollAreaRef}
        className="flex-1 space-y-1 overflow-y-auto px-3 py-3"
      >
        {isLoading && <MessagesSkeleton />}
        {!isLoading && hasMore && !searchTrimmed && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-1.5 text-xs"
              disabled={loadingOlder}
              onClick={() => setCursor(nextCursorForLoad)}
            >
              <ChevronUp className="h-3.5 w-3.5" />
              {loadingOlder ? "Loading…" : "Load earlier messages"}
            </Button>
          </div>
        )}
        {!isLoading && displayMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <p className="text-muted-foreground text-sm">
              {searchTrimmed
                ? `No messages matching "${searchQuery}"`
                : "No messages yet. Say hello! 👋"}
            </p>
          </div>
        )}
        {displayMessages.map((msg, i) => {
          const prev = displayMessages[i - 1];
          const showDate =
            !prev ||
            !isSameDay(new Date(msg.createdAt), new Date(prev.createdAt));
          const showAvatar =
            !searchTrimmed &&
            (!prev ||
              prev.senderId !== msg.senderId ||
              new Date(msg.createdAt).getTime() -
                new Date(prev.createdAt).getTime() >
                5 * 60 * 1000);

          return (
            <div
              key={msg.id}
              data-message-id={msg.id}
              className="rounded-lg transition-colors duration-[1500ms]"
            >
              {showDate && <DateDivider date={new Date(msg.createdAt)} />}
              {msg.type === "ACTIVITY" ? (
                <ActivityMessage message={msg} />
              ) : msg.deletedAt ? (
                <DeletedMessage
                  message={msg}
                  isMine={msg.senderId === currentUser.id}
                  showAvatar={showAvatar}
                />
              ) : (
                <ChatMessage
                  message={msg}
                  isMine={msg.senderId === currentUser.id}
                  showAvatar={showAvatar}
                  onReply={setReplyTo}
                  onDelete={() => del.mutate({ messageId: msg.id })}
                  onReact={(emoji) =>
                    react.mutate({ messageId: msg.id, emoji })
                  }
                  onPin={() => pin.mutate({ messageId: msg.id })}
                  currentUserId={currentUser.id}
                  onJumpToMessage={jumpToMessage}
                />
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      {replyTo && !showSearch && (
        <div className="bg-accent/30 flex items-center gap-2 border-t px-4 py-2">
          <Reply className="text-primary h-4 w-4 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-primary text-xs font-medium">
              {replyTo.sender.name}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {replyTo.content}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setReplyTo(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Input */}
      {!showSearch && !canPost ? (
        <div className="bg-muted/30 border-t px-4 py-3 text-center">
          <p className="text-muted-foreground text-xs">
            You are not allowed to post in this group.
          </p>
        </div>
      ) : !showSearch ? (
        <div className="flex items-end gap-2 border-t px-3 py-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
            onChange={handleFileChange}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingFile || send.isPending}
            title="Attach file"
          >
            {isUploadingFile ? (
              <span className="border-primary h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>
          <div className="relative flex-1">
            {mentionQuery !== null && mentionCandidates.length > 0 && (
              <div className="bg-popover absolute bottom-full left-0 z-20 mb-1 w-56 overflow-hidden rounded-xl border shadow-lg">
                {mentionCandidates.map((u, i) => (
                  <button
                    key={u.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyMention(u);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                      i === mentionIndex ? "bg-accent" : "hover:bg-accent/50",
                    )}
                  >
                    <UserAvatar src={u.image} name={u.name} size={24} />
                    <div className="min-w-0">
                      <p className="text-foreground truncate text-xs font-medium">
                        {u.name}
                      </p>
                      <p className="text-muted-foreground truncate text-[10px]">
                        @{u.username}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <Textarea
              ref={textareaRef}
              placeholder="Message…"
              className="max-h-32 min-h-[40px] w-full resize-none text-sm"
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex-shrink-0 pb-0.5">
            <Button
              size="icon"
              className="h-9 w-9"
              onClick={handleSend}
              disabled={!text.trim() || send.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <GroupInfoSheet
        groupId={group.id}
        open={showInfo}
        onClose={() => setShowInfo(false)}
        currentUserId={currentUser.id}
      />
    </div>
  );
}

function renderContent(text: string, isMine: boolean) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (/^@\w+$/.test(part)) {
      const username = part.slice(1);
      return (
        <UserLink
          key={i}
          username={username}
          stopPropagation
          className={cn(
            "font-semibold",
            isMine ? "text-primary-foreground" : "text-primary",
          )}
        >
          {part}
        </UserLink>
      );
    }
    return part;
  });
}

function ChatMessage({
  message,
  isMine,
  showAvatar,
  onReply,
  onDelete,
  onReact,
  onPin,
  onJumpToMessage,
  currentUserId,
}: {
  message: Message;
  isMine: boolean;
  showAvatar: boolean;
  onReply: (m: Message) => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onPin: () => void;
  onJumpToMessage: (id: string) => void;
  currentUserId: string;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyText = () => {
    void navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // Group reactions by emoji
  const reactionMap = message.reactions.reduce<
    Record<string, { count: number; mine: boolean; users: string[] }>
  >((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false, users: [] };
    acc[r.emoji]!.count++;
    acc[r.emoji]!.users.push(r.user.name);
    if (r.userId === currentUserId) acc[r.emoji]!.mine = true;
    return acc;
  }, {});

  return (
    <div
      className={cn(
        "group flex items-end gap-2",
        isMine ? "flex-row-reverse" : "flex-row",
        showAvatar ? "mt-3" : "mt-0.5",
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmoji(false);
      }}
    >
      <div className="w-8 flex-shrink-0">
        {showAvatar && !isMine && (
          <UserLink username={message.sender.username} className="no-underline">
            <UserAvatar
              src={message.sender.image}
              name={message.sender.name}
              size={32}
            />
          </UserLink>
        )}
      </div>

      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-0.5",
          isMine && "items-end",
        )}
      >
        {showAvatar && !isMine && (
          <UserLink
            username={message.sender.username}
            className="text-foreground/70 ml-1 text-xs font-medium"
          >
            {message.sender.name}
          </UserLink>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <button
            type="button"
            onClick={() => onJumpToMessage(message.replyTo!.id)}
            className={cn(
              "border-primary/60 bg-accent/50 hover:bg-accent mb-0.5 w-full cursor-pointer rounded-lg border-l-2 px-2 py-1 text-left transition-colors",
              isMine && "border-white/60 hover:bg-white/10",
            )}
          >
            <p className="text-primary text-[11px] font-medium">
              {message.replyTo.sender.name}
            </p>
            <p className="text-muted-foreground truncate text-[11px]">
              {message.replyTo.content}
            </p>
          </button>
        )}

        <div
          className={cn("flex items-end gap-1.5", isMine && "flex-row-reverse")}
        >
          {/* Bubble */}
          <div
            className={cn(
              "overflow-hidden rounded-2xl shadow-sm",
              message.type === "IMAGE"
                ? "p-0"
                : "px-3 py-2 text-sm leading-relaxed",
              isMine
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-card text-foreground rounded-bl-sm border",
            )}
          >
            {message.type === "IMAGE" ? (
              <>
                <button
                  type="button"
                  onClick={() => setLightbox(true)}
                  className="group/img relative block"
                >
                  <Image
                    src={message.content}
                    alt="image"
                    width={280}
                    height={200}
                    className="max-w-[280px] cursor-zoom-in rounded-2xl object-cover transition-opacity hover:opacity-90"
                    style={{ maxHeight: 200 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/0 transition-colors group-hover/img:bg-black/20">
                    <ZoomIn className="h-6 w-6 text-white opacity-0 drop-shadow transition-opacity group-hover/img:opacity-80" />
                  </div>
                </button>
                <Dialog open={lightbox} onOpenChange={setLightbox}>
                  <DialogContent className="max-w-screen-md border-none bg-black/90 p-2">
                    <Image
                      src={message.content}
                      alt="image"
                      width={1200}
                      height={800}
                      className="h-auto max-h-[85vh] w-full rounded-lg object-contain"
                    />
                  </DialogContent>
                </Dialog>
              </>
            ) : message.type === "FILE" ? (
              <a
                href={message.content}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 transition-colors",
                  isMine ? "hover:bg-primary-foreground/10" : "hover:bg-accent",
                )}
              >
                <FileIcon className="h-4 w-4 flex-shrink-0" />
                <span className="max-w-[180px] truncate text-sm">
                  {(message.metadata as any)?.fileName ?? "File"}
                </span>
              </a>
            ) : (
              <p className="break-words whitespace-pre-wrap">
                {renderContent(message.content, isMine)}
              </p>
            )}
            <p
              className={cn(
                "mt-0.5 flex items-center justify-end gap-1 text-right text-[10px]",
                message.type === "IMAGE" ? "px-2 pb-1" : "",
                isMine ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {message.isPinned && (
                <Pin className="h-2.5 w-2.5 flex-shrink-0" />
              )}
              {format(new Date(message.createdAt), "h:mm a")}
            </p>
          </div>

          {/* Action buttons */}
          {showActions && (
            <div
              className={cn(
                "mb-5 flex items-center gap-0.5",
                isMine ? "flex-row-reverse" : "flex-row",
              )}
            >
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-70 hover:opacity-100"
                  onClick={() => setShowEmoji((v) => !v)}
                >
                  <Smile className="h-3.5 w-3.5" />
                </Button>
                {showEmoji && (
                  <div
                    className={cn(
                      "bg-popover absolute bottom-full z-10 mb-1 flex items-center gap-1 rounded-full border p-1 shadow-lg",
                      isMine ? "right-0" : "left-0",
                    )}
                  >
                    {COMMON_EMOJIS.map((e) => (
                      <button
                        key={e}
                        className="hover:bg-accent h-7 w-7 rounded-full text-base"
                        onClick={() => {
                          onReact(e);
                          setShowEmoji(false);
                        }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-70 hover:opacity-100"
                onClick={() => onReply(message)}
              >
                <CornerDownLeft className="h-3.5 w-3.5" />
              </Button>
              {message.type === "TEXT" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-70 hover:opacity-100"
                  onClick={handleCopyText}
                  title="Copy message"
                >
                  {copied ? (
                    <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 opacity-70 hover:opacity-100",
                  message.isPinned && "text-primary opacity-100",
                )}
                onClick={onPin}
                title={message.isPinned ? "Unpin message" : "Pin message"}
              >
                {message.isPinned ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </Button>
              {isMine && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-destructive h-7 w-7 opacity-70 hover:opacity-100"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Reactions */}
        {Object.keys(reactionMap).length > 0 && (
          <div
            className={cn("flex flex-wrap gap-1 px-1", isMine && "justify-end")}
          >
            {Object.entries(reactionMap).map(([emoji, { count, mine }]) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className={cn(
                  "flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition-colors",
                  mine
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-accent/50 border-border hover:bg-accent",
                )}
                title={reactionMap[emoji]?.users.join(", ")}
              >
                {emoji} {count > 1 && count}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DeletedMessage({
  message,
  isMine,
  showAvatar,
}: {
  message: Message;
  isMine: boolean;
  showAvatar: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isMine ? "flex-row-reverse" : "flex-row",
        showAvatar ? "mt-3" : "mt-0.5",
      )}
    >
      <div className="w-8 flex-shrink-0" />
      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-0.5",
          isMine && "items-end",
        )}
      >
        {showAvatar && !isMine && (
          <UserLink
            username={message.sender.username}
            className="text-foreground/70 ml-1 text-xs font-medium"
          >
            {message.sender.name}
          </UserLink>
        )}
        <div className="flex items-end gap-1.5">
          <div
            className={cn(
              "rounded-2xl border border-dashed px-3 py-2 text-sm leading-relaxed",
              isMine
                ? "bg-primary/10 border-primary/20 rounded-br-sm"
                : "bg-muted border-muted-foreground/20 rounded-bl-sm",
            )}
          >
            <p className="text-muted-foreground text-xs italic">
              This message was deleted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityMessage({ message }: { message: Message }) {
  const meta = (message.metadata as any) ?? {};
  let href: string | null = null;
  if (meta.event === "CLASS_CREATED" && meta.classId && meta.courseId) {
    href = `/courses/class?id=${meta.courseId}&classId=${meta.classId}`;
  } else if (meta.event === "ASSIGNMENT_CREATED" && meta.attachmentId) {
    href = `/assignments/detail?id=${meta.attachmentId}`;
  }

  return (
    <div className="flex justify-center py-2">
      {href ? (
        <Link
          href={href}
          className="bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full px-3 py-0.5 text-xs italic transition-colors hover:underline"
        >
          {message.content}
        </Link>
      ) : (
        <span className="bg-muted/70 text-muted-foreground rounded-full px-3 py-0.5 text-xs italic">
          {message.content}
        </span>
      )}
    </div>
  );
}

function DateDivider({ date }: { date: Date }) {
  const label = isToday(date)
    ? "Today"
    : isYesterday(date)
      ? "Yesterday"
      : format(date, "MMMM d, yyyy");

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="bg-border h-px flex-1" />
      <span className="text-muted-foreground text-[11px] font-medium">
        {label}
      </span>
      <div className="bg-border h-px flex-1" />
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="space-y-4 p-2">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-end gap-2",
            i % 3 === 0 && "flex-row-reverse",
          )}
        >
          <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
          <div
            className={cn(
              "space-y-1",
              i % 3 === 0 && "flex flex-col items-end",
            )}
          >
            <div className="bg-muted h-3 w-16 animate-pulse rounded" />
            <div
              className={cn(
                "bg-muted h-10 animate-pulse rounded-2xl",
                i % 2 === 0 ? "w-48" : "w-32",
              )}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
