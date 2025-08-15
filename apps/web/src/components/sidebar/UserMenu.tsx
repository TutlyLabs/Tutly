"use client";

import { Download, LockIcon, LogOut, UserIcon } from "lucide-react";
// import {  Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { FaCaretDown } from "react-icons/fa";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SessionUser } from "@/lib/auth";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface UserMenuProps {
  user: SessionUser;
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="relative">
      <DropdownMenu onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <div className="bg-muted hover:bg-muted/80 flex w-16 cursor-pointer items-center rounded-xl px-2 py-1">
            <Avatar className="h-7 w-7 cursor-pointer rounded-full">
              <AvatarImage
                src={user.image ?? "/placeholder.jpg"}
                alt={user.name ?? user.username}
              />
              <AvatarFallback className="rounded-full">
                {user.name
                  ? user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                  : user.username}
              </AvatarFallback>
            </Avatar>
            <div
              className="ml-1 transition-transform duration-200"
              style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <FaCaretDown className="h-4 w-4" />
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="bg-background border-border w-56 rounded-lg border shadow-lg"
          side="bottom"
          align="end"
          sideOffset={4}
        >
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="h-7 w-7 rounded-full">
                <AvatarImage
                  src={user.image ?? "/placeholder.jpg"}
                  alt={user.name}
                />
                <AvatarFallback className="rounded-full">
                  {user.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <a href="/profile">
              <DropdownMenuItem className="flex cursor-pointer items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Profile
              </DropdownMenuItem>
            </a>
            <a href={`/change-password`}>
              <DropdownMenuItem className="flex cursor-pointer items-center gap-2">
                <LockIcon className="h-5 w-5" />
                Manage Password
              </DropdownMenuItem>
            </a>
            {/* {user.role === "STUDENT" && (
              <a href="/certificate">
                <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                  <GrCertificate className="w-5 h-5" />
                  Certificate
                </DropdownMenuItem>
              </a>
            )} */}

            {/* <a href="/sessions">
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
              >
                <Settings className="w-5 h-5" />
                Security Settings
              </DropdownMenuItem>
            </a> */}
            {/* <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
              <Bell className="w-5 h-5" />
              Notifications
            </DropdownMenuItem> */}
            {/* {!isStandalone && deferredPrompt && (
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={handleInstallClick}
              >
                <Download className="w-5 h-5" />
                Install App
              </DropdownMenuItem>
            )} */}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              const { data, error } = await authClient.signOut();
              if (error) {
                toast.error(error.message);
              } else {
                toast.success("You have been logged out");
                router.push("/sign-in");
              }
            }}
            className="flex cursor-pointer items-center gap-2 text-red-600"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* <AlertDialog open={showOpenInAppDialog} onOpenChange={setShowOpenInAppDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open in App</AlertDialogTitle>
            <AlertDialogDescription>
              The app has been installed successfully. Would you like to open it now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on Web</AlertDialogCancel>
            <AlertDialogAction onClick={handleOpenInApp}>Open App</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}
    </div>
  );
}
