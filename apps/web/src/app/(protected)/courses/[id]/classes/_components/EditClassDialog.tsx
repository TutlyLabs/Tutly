"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FaPlus } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";

interface Folder {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EditClassDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  classDetails: {
    id: string;
    title: string;
    createdAt: Date;
    video?: {
      videoLink: string | null;
      videoType: string;
    } | null;
    Folder?: {
      id: string;
      title: string;
    } | null;
  };
}

const EditClassDialog = ({
  isOpen,
  onOpenChange,
  courseId,
  classDetails,
}: EditClassDialogProps) => {
  const [videoLink, setVideoLink] = useState("");
  const [videoType, setVideoType] = useState("DRIVE");
  const [classTitle, setClassTitle] = useState("");
  const [textValue, setTextValue] = useState("Update Class");
  const [folderName, setFolderName] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [createdAt, setCreatedAt] = useState(
    new Date().toISOString().split("T")[0],
  );

  const updateClass = api.classes.updateClass.useMutation();
  const getFolders = api.courses.foldersByCourseId.useQuery({ id: courseId });

  useEffect(() => {
    if (classDetails) {
      setClassTitle(classDetails.title ?? "");
      setVideoLink(classDetails.video?.videoLink ?? "");
      setVideoType(classDetails.video?.videoType ?? "DRIVE");
      setCreatedAt(
        new Date(classDetails.createdAt).toISOString().split("T")[0],
      );
      setSelectedFolder(classDetails.Folder?.id ?? "");
    }
  }, [classDetails]);

  useEffect(() => {
    if (getFolders.data) {
      setFolders(getFolders.data);
    }
  }, [getFolders.data]);

  const handleUpdateClass = async () => {
    if (!classTitle.trim()) {
      toast.error("Please fill all necessary fields");
      return;
    }

    setTextValue("Updating Class");
    try {
      await updateClass.mutateAsync({
        classId: classDetails.id,
        courseId: courseId,
        classTitle: classTitle.trim(),
        videoLink: videoLink || null,
        videoType: videoType as "DRIVE" | "ZOOM" | "YOUTUBE",
        createdAt: createdAt,
        folderId:
          selectedFolder === "none"
            ? undefined
            : selectedFolder === "new"
              ? undefined
              : selectedFolder,
        folderName: selectedFolder === "new" ? folderName.trim() : undefined,
      });

      toast.success("Class updated successfully");
      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      toast.error("Failed to update class");
    } finally {
      setTextValue("Update Class");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Class</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Select value={videoType} onValueChange={setVideoType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Video Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRIVE">Drive</SelectItem>
              <SelectItem value="YOUTUBE">YouTube</SelectItem>
              <SelectItem value="ZOOM">Zoom</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="text"
            placeholder="Enter class title"
            value={classTitle}
            onChange={(e) => setClassTitle(e.target.value)}
          />

          <Input
            type="text"
            placeholder="Enter video link"
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
          />

          <Input
            type="date"
            value={createdAt}
            onChange={(e) => setCreatedAt(e.target.value)}
          />

          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger>
              <SelectValue placeholder="Select Folder (Optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Folder</SelectItem>
              <SelectItem value="new">Create New Folder</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedFolder === "new" && (
            <Input
              type="text"
              placeholder="Enter new folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
            />
          )}

          <Button
            disabled={!classTitle || textValue === "Updating Class"}
            className="w-full"
            onClick={handleUpdateClass}
          >
            {textValue}
            {textValue === "Updating Class" ? (
              <FaPlus className="ml-2 animate-spin" />
            ) : (
              <FaPlus className="ml-2" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditClassDialog;
