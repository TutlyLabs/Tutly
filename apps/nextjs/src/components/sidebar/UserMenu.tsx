"use client";

import { useState } from "react";
import { LockIcon, LogOut, UserIcon } from "lucide-react";
import { FaCaretDown } from "react-icons/fa";

import type { User } from "@tutly/db/types";
import { authClient } from "@tutly/auth/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@tutly/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@tutly/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tutly/ui/dropdown-menu";

interface UserMenuProps {
  user: User;
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showOpenInAppDialog, setShowOpenInAppDialog] = useState(false);

  const handleOpenInApp = () => {
    window.location.href = window.location.href;
    setShowOpenInAppDialog(false);
  };

  const handleSignout = async () => {
    setIsOpen(false);
    try {
      await authClient.signOut();

      await new Promise((resolve) => setTimeout(resolve, 200));

      window.location.href = "/sign-in";
    } catch (error) {
      console.log("Error at user-menu: ", error);
    }
  };

  return (
    <div className="relative">
      <DropdownMenu onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <div className="flex w-16 cursor-pointer items-center rounded-xl bg-muted px-2 py-1 hover:bg-muted/80">
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
          className="w-56 rounded-lg border border-border bg-background shadow-lg"
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
                <span className="truncate text-xs text-muted-foreground">
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
            <a href={`/reset-password?email=${user.email}`}>
              <DropdownMenuItem className="flex cursor-pointer items-center gap-2">
                <LockIcon className="h-5 w-5" />
                Reset Password
              </DropdownMenuItem>
            </a>
            {/* {user.role === "STUDENT" && (
              <a href="/certificate">
                <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                  <GrCertificate className="h-5 w-5" />
                  Certificate
                </DropdownMenuItem>
              </a>
            )} */}

            {/* <a href="/sessions">
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
              >
                <Settings className="h-5 w-5" />
                Security Settings
              </DropdownMenuItem>
            </a> */}
            {/* <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
              <Bell className="h-5 w-5" />
              Notifications
            </DropdownMenuItem> */}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignout}
            className="flex cursor-pointer items-center gap-2 text-destructive"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={showOpenInAppDialog}
        onOpenChange={setShowOpenInAppDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open in App</AlertDialogTitle>
            <AlertDialogDescription>
              The app has been installed successfully. Would you like to open it
              now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on Web</AlertDialogCancel>
            <AlertDialogAction onClick={handleOpenInApp}>
              Open App
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
