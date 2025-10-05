"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FaPlus } from "react-icons/fa";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface NewClassDialogProps {
  courseId: string;
}

const NewClassDialog = ({ courseId }: NewClassDialogProps) => {
  const [videoLink, setVideoLink] = useState("");
  const [videoType, setVideoType] = useState("DRIVE");
  const [classTitle, setClassTitle] = useState("");
  const [textValue, setTextValue] = useState("Create Class");
  const [folderName, setFolderName] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [createdAt, setCreatedAt] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const createClass = api.classes.createClass.useMutation();
  const getFolders = api.courses.foldersByCourseId.useQuery({ id: courseId });

  useEffect(() => {
    if (getFolders.data) {
      setFolders(getFolders.data);
    }
  }, [getFolders.data]);

  const handleCreateClass = async () => {
    if (!classTitle.trim()) {
      toast.error("Please fill all necessary fields");
      return;
    }

    setTextValue("Creating Class");
    try {
      const result = await createClass.mutateAsync({
        classTitle,
        videoLink,
        videoType: videoType as "DRIVE" | "ZOOM" | "YOUTUBE",
        courseId: courseId,
        createdAt,
        folderId: selectedFolder !== "new" ? selectedFolder : undefined,
        folderName: selectedFolder === "new" ? folderName.trim() : undefined,
      });

      if (result) {
        toast.success("Class added successfully");
        setVideoLink("");
        setClassTitle("");
        setSelectedFolder("");
        setFolderName("");
        setIsOpen(false);
        router.push(`/courses/${courseId}/classes/${result.id}`);
      }
    } catch (error: unknown) {
      toast.error("Failed to add new class");
    } finally {
      setTextValue("Create Class");
      router.refresh();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Add New Class</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Class</DialogTitle>
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
              <SelectItem value="new">New Folder</SelectItem>
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
            disabled={!classTitle || textValue === "Creating Class"}
            className="w-full"
            onClick={handleCreateClass}
          >
            {textValue}
            {textValue === "Creating Class" ? (
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

export default NewClassDialog;
