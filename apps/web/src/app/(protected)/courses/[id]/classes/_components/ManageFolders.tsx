"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FaEdit, FaTrash } from "react-icons/fa";
import { FaFolderTree } from "react-icons/fa6";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";

interface Folder {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    Class: number;
  };
}

const ManageFolders = ({ courseId }: { courseId: string }) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const getFolders = api.courses.foldersByCourseId.useQuery({ id: courseId });
  const updateFolder = api.folders.updateFolder.useMutation();
  const deleteFolder = api.folders.deleteFolder.useMutation();

  useEffect(() => {
    if (isOpen && getFolders.data) {
      setFolders(getFolders.data);
    }
  }, [isOpen, getFolders.data]);

  useEffect(() => {
    const modal = searchParams.get("modal");
    if (modal === "manageFolders") {
      setIsOpen(true);
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("modal");
      const cleanUrl = newSearchParams.toString()
        ? `${window.location.pathname}?${newSearchParams.toString()}`
        : window.location.pathname;
      router.replace(cleanUrl, { scroll: false });
    }
  }, [searchParams, router]);

  const handleEditFolder = async (folderId: string) => {
    if (!editedName.trim()) {
      toast.error("Folder name cannot be empty");
      return;
    }

    try {
      await updateFolder.mutateAsync({
        id: folderId,
        title: editedName.trim(),
      });
      toast.success("Folder updated successfully");
      setEditingFolder(null);
      await getFolders.refetch();
    } catch (error) {
      toast.error("Failed to update folder");
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;

    try {
      await deleteFolder.mutateAsync({
        id: folderToDelete.id,
      });
      toast.success("Folder deleted successfully");
      setDeleteDialogOpen(false);
      setFolderToDelete(null);
      await getFolders.refetch();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete folder",
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 cursor-pointer"
        >
          <FaFolderTree className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Folders</DialogTitle>
        </DialogHeader>
        <div className="mt-4 max-h-[400px] overflow-y-auto">
          {folders.length === 0 ? (
            <p className="text-muted-foreground text-center">
              No folders found
            </p>
          ) : (
            <div className="space-y-4 pr-2">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center justify-between gap-2"
                >
                  {editingFolder === folder.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="Enter folder name"
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleEditFolder(folder.id)}
                        className="px-3"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingFolder(null)}
                        className="px-3"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="font-medium">{folder.title}</p>
                        <p className="text-muted-foreground text-sm">
                          {folder._count?.Class ?? 0} classes
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingFolder(folder.id);
                            setEditedName(folder.title);
                          }}
                        >
                          <FaEdit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setFolderToDelete(folder);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <FaTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{folderToDelete?.title}
              &quot;?
              {folderToDelete &&
                folderToDelete._count &&
                folderToDelete._count.Class > 0 && (
                  <span className="text-destructive mt-2 block font-medium">
                    This folder contains {folderToDelete._count.Class}{" "}
                    class(es). Please move or delete them first.
                  </span>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              disabled={
                folderToDelete?._count?.Class
                  ? folderToDelete._count.Class > 0
                  : false
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default ManageFolders;
