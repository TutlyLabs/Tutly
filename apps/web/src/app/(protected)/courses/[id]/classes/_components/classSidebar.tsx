"use client";

import type { Class, Folder } from "@/lib/prisma";
import { useEffect, useState } from "react";
import { FaFolder, FaFolderOpen } from "react-icons/fa6";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { MdOndemandVideo } from "react-icons/md";
import { IoStatsChart } from "react-icons/io5";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

import ManageFolders from "./ManageFolders";
import NewClassDialog from "./newClass";
import NewAssignmentDialog from "./NewAssignmentDialog";
import { api } from "@/trpc/react";
import { usePathname } from "next/navigation";

function ClassSidebar({
  courseId,
  title,
  currentUser,
  isCourseAdmin = false,
}: {
  courseId: string;
  title: string;
  currentUser: SessionUser;
  isCourseAdmin: boolean;
}) {
  const [openFolders, setOpenFolders] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const { data } = api.classes.getClassesByCourseId.useQuery({ courseId });
  const classes = data?.data ?? [];

  // Open folder of current class on mount
  useEffect(() => {
    const classId = pathname.split("/").pop();
    const currentClass = classes.find((c) => c.id === classId);
    if (
      currentClass?.folderId &&
      !openFolders.includes(currentClass.folderId)
    ) {
      setOpenFolders([...openFolders, currentClass.folderId]);
    }
  }, [pathname, classes, openFolders]);

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

  const renderClassButton = (classItem: Class) => (
    <Button
      key={classItem.id}
      variant={
        pathname === `/courses/${courseId}/classes/${classItem.id}`
          ? "secondary"
          : "ghost"
      }
      asChild
      className="w-full justify-start gap-2"
    >
      <Link href={`/courses/${courseId}/classes/${classItem.id}`}>
        <MdOndemandVideo className="h-4 w-4" />
        {classItem.title}
      </Link>
    </Button>
  );

  return (
    <div className="relative z-10">
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isCollapsed ? "w-0" : "w-[200px]",
          "bg-background flex h-full flex-col border-r shadow-sm",
        )}
      >
        <div className={cn("border-b px-3 py-2", isCollapsed && "hidden")}>
          <Link href={`/courses/${courseId}`} className="hover:opacity-80">
            <h1 className="text-sm font-semibold">{title}</h1>
          </Link>
        </div>
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
                      href={`/tutor/statistics/${courseId}`}
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
          className={cn("max-h-[80vh] flex-1 px-1", isCollapsed && "hidden")}
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
      </div>
    </div>
  );
}

export default ClassSidebar;
