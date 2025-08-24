"use client";

import type { Class, Folder } from "@prisma/client";
import { useEffect, useState } from "react";
import { FaFolder, FaFolderOpen } from "react-icons/fa6";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { MdOndemandVideo } from "react-icons/md";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

import ManageFolders from "./ManageFolders";
import NewClassDialog from "./newClass";
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <a href={`/courses/${courseId}/classes/${classItem.id}`}>
        <MdOndemandVideo className="h-4 w-4" />
        {classItem.title}
      </a>
    </Button>
  );

  return (
    <div className="relative z-10">
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isCollapsed ? "w-0" : "w-[200px]",
          "bg-background sticky flex h-dvh flex-col border-r shadow-sm max-sm:absolute sm:top-10",
        )}
      >
        <div className={cn("border-b px-3 py-2", isCollapsed && "hidden")}>
          <a href={`/courses/${courseId}`} className="hover:opacity-80">
            <h1 className="text-sm font-semibold">{title}</h1>
          </a>
        </div>

        <ScrollArea className={cn("flex-1 px-1", isCollapsed && "hidden")}>
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
        {pathname !== `/courses/${courseId}/classes/new` &&
          (currentUser?.role === "INSTRUCTOR" || isCourseAdmin) && (
            <div
              className={cn(
                "bg-background sticky bottom-0 space-y-2 p-4",
                isCollapsed && "hidden",
              )}
            >
              <ManageFolders courseId={courseId} />
              <NewClassDialog courseId={courseId} />
            </div>
          )}

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
