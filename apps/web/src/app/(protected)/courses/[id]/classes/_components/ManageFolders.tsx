"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FaEdit } from "react-icons/fa";

import { Button } from "@/components/ui/button";
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

  const getFolders = api.courses.foldersByCourseId.useQuery({ id: courseId });
  const updateFolder = api.folders.updateFolder.useMutation();

  useEffect(() => {
    if (isOpen && getFolders.data) {
      setFolders(getFolders.data);
    }
  }, [isOpen, getFolders.data]);

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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 px-3">Manage Folders</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Folders</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {folders.length === 0 ? (
            <p className="text-muted-foreground text-center">
              No folders found
            </p>
          ) : (
            <div className="space-y-4">
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
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageFolders;
