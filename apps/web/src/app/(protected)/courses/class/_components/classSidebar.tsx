"use client";

import type { Class, Folder } from "@tutly/db/browser";
import { useEffect, useState } from "react";
import { FaFolder, FaFolderOpen } from "react-icons/fa6";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { MdOndemandVideo } from "react-icons/md";
import { IoStatsChart } from "react-icons/io5";
import { Clock } from "lucide-react";
import Link from "next/link";

import { Button } from "@tutly/ui/button";
import { ScrollArea } from "@tutly/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tutly/ui/tooltip";
import type { SessionUser } from "@/lib/auth";
import { cn } from "@tutly/utils";

import ManageFolders from "./ManageFolders";
import NewClassDialog from "./newClass";
import NewAssignmentDialog from "./NewAssignmentDialog";
import { api } from "@/trpc/react";
import { useSearchParams } from "next/navigation";

function ClassSidebar({
  courseId,
  title,
  currentUser,
  isCourseAdmin = false,
  mobileFull = false,
}: {
  courseId: string;
  title: string;
  currentUser: SessionUser;
  isCourseAdmin: boolean;
  mobileFull?: boolean;
}) {
  const [openFolders, setOpenFolders] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sp = useSearchParams();
  const currentClassId = sp.get("classId");

  const { data } = api.classes.getClassesByCourseId.useQuery({ courseId });
  const classes = data?.data ?? [];

  useEffect(() => {
    const currentClass = classes.find((c) => c.id === currentClassId);
    if (
      currentClass?.folderId &&
      !openFolders.includes(currentClass.folderId)
    ) {
      setOpenFolders([...openFolders, currentClass.folderId]);
    }
  }, [currentClassId, classes, openFolders]);

  // Group classes by folder
  const { folderClasses, unfolderClasses } = classes.reduce(
    (acc, classItem) => {
      if (classItem.folderId) {
        acc.folderClasses[classItem.folderId] =
          acc.folderClasses[classItem.folderId] ?? [];
        acc.folderClasses[classItem.folderId]!.push(classItem);
      } else {
        acc.unfolderClasses.push(classItem);
      }
      return acc;
    },
    {
      folderClasses: {} as Record<string, Class[]>,
      unfolderClasses: [] as Class[],
    },
  );

  const getLiveStatus = (classItem: Class) => {
    const ct = (classItem as any).classType;
    if (ct !== "LIVE") return null;
    const now = new Date();
    const start = (classItem as any).startTime
      ? new Date((classItem as any).startTime)
      : null;
    const end = (classItem as any).endTime
      ? new Date((classItem as any).endTime)
      : null;
    if (start && end && now >= start && now <= end) return "live";
    if (start && now < start) return "upcoming";
    return null;
  };

  const renderClassButton = (classItem: Class) => {
    const liveStatus = getLiveStatus(classItem);
    return (
      <div key={classItem.id} className="relative flex items-center gap-1">
        <Button
          variant={currentClassId === classItem.id ? "secondary" : "ghost"}
          asChild
          className="w-full justify-start gap-2"
        >
          <Link href={`/courses/class?id=${courseId}&classId=${classItem.id}`}>
            <MdOndemandVideo className="h-4 w-4" />
            <span className="flex-1 truncate text-left">{classItem.title}</span>
            {liveStatus === "live" && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                LIVE
              </span>
            )}
            {liveStatus === "upcoming" && (
              <span className="text-muted-foreground ml-auto">
                <Clock className="h-3 w-3" />
              </span>
            )}
          </Link>
        </Button>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "relative z-10 h-full",
        mobileFull && "w-full",
      )}
    >
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          mobileFull
            ? "w-full"
            : isCollapsed
              ? "w-0"
              : "w-[220px]",
          mobileFull
            ? "bg-background flex h-full flex-col"
            : "bg-background flex h-full flex-col border-r shadow-sm",
        )}
      >
        {!mobileFull && (
          <div className={cn("border-b px-3 py-2", isCollapsed && "hidden")}>
            <Link
              href={`/courses/detail?id=${courseId}`}
              className="hover:opacity-80"
            >
              <h1 className="text-foreground text-sm font-semibold">
                {title}
              </h1>
            </Link>
          </div>
        )}
        {(currentUser?.role === "INSTRUCTOR" || isCourseAdmin) && (
          <TooltipProvider>
            <div className="flex justify-around border-b py-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ManageFolders courseId={courseId} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Manage Folders</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <NewClassDialog courseId={courseId} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>New Class</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <NewAssignmentDialog courseId={courseId} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>New Assignment</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Link
                      href={`/tutor/statistics/detail?id=${courseId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                      >
                        <IoStatsChart className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Statistics</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}

        <ScrollArea
          className={cn(
            "min-h-0 flex-1 px-1",
            isCollapsed && "hidden",
          )}
        >
          <div className="space-y-1 p-2">
            {Object.entries(folderClasses).map(([folderId, classItems]) => {
              const folder = classes.find(
                (c) => c.folderId === folderId,
              )?.Folder;
              if (!folder) return null;

              const isOpen = openFolders.includes(folder.id);

              return (
                <div key={folder.id} className="space-y-1">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setOpenFolders(
                        isOpen
                          ? openFolders.filter((id) => id !== folder.id)
                          : [...openFolders, folder.id],
                      )
                    }
                    className="w-full justify-start gap-2 font-medium"
                  >
                    {isOpen ? (
                      <FaFolderOpen className="h-4 w-4" />
                    ) : (
                      <FaFolder className="h-4 w-4" />
                    )}
                    {folder.title}
                  </Button>
                  {isOpen && (
                    <div className="ml-4 space-y-1">
                      {classItems.map(renderClassButton)}
                    </div>
                  )}
                </div>
              );
            })}

            {unfolderClasses.length > 0 && (
              <div className="space-y-1">
                {unfolderClasses.map(renderClassButton)}
              </div>
            )}
          </div>
        </ScrollArea>

        {!mobileFull && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "absolute top-[350px] -right-4 h-8 w-8 rounded-full shadow-md transition-all duration-300",
            )}
          >
            {isCollapsed ? <IoIosArrowForward /> : <IoIosArrowBack />}
          </Button>
        )}
      </div>
    </div>
  );
}

export default ClassSidebar;
