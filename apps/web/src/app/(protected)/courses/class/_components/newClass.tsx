"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Video, Phone, Radio } from "lucide-react";
import { MdOndemandVideo } from "react-icons/md";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@tutly/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@tutly/ui/dialog";
import { Input } from "@tutly/ui/input";
import { Label } from "@tutly/ui/label";
import { RadioGroup, RadioGroupItem } from "@tutly/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tutly/ui/select";
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

/** Extract meeting ID and passcode from a Zoom URL */
function parseZoomUrl(url: string): {
  meetingId: string;
  passcode: string;
} {
  const result = { meetingId: "", passcode: "" };
  try {
    // Extract meeting ID from path: /j/88022842397
    const idMatch = url.match(/\/j\/(\d+)/);
    if (idMatch?.[1]) {
      // Format as spaced groups: 880 2284 2397
      const raw = idMatch[1];
      result.meetingId = raw.replace(/(\d{3})(\d{4})(\d{4})/, "$1 $2 $3");
    }
    // Extract passcode from query param: ?pwd=...
    const urlObj = new URL(url);
    const pwd = urlObj.searchParams.get("pwd");
    if (pwd) {
      result.passcode = pwd;
    }
  } catch {
    // Not a valid URL, ignore
  }
  return result;
}

const NewClassDialog = ({ courseId }: NewClassDialogProps) => {
  const [classTitle, setClassTitle] = useState("");
  const [textValue, setTextValue] = useState("Create Class");
  const [folderName, setFolderName] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [createdAt, setCreatedAt] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [classType, setClassType] = useState<"RECORDED" | "LIVE">("RECORDED");
  const [videoLink, setVideoLink] = useState("");
  const [videoType, setVideoType] = useState("DRIVE");
  const [liveProvider, setLiveProvider] = useState<"ZOOM" | "GOOGLE_MEET">(
    "ZOOM",
  );
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [meetingPasscode, setMeetingPasscode] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const createClass = api.classes.createClass.useMutation();
  const getFolders = api.courses.foldersByCourseId.useQuery({ id: courseId });

  useEffect(() => {
    if (getFolders.data) setFolders(getFolders.data);
  }, [getFolders.data]);

  useEffect(() => {
    const modal = searchParams.get("modal");
    if (modal === "newClass") {
      setIsOpen(true);
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("modal");
      const cleanUrl = newSearchParams.toString()
        ? `${window.location.pathname}?${newSearchParams.toString()}`
        : window.location.pathname;
      router.replace(cleanUrl, { scroll: false });
    }
  }, [searchParams, router]);

  // Auto-extract Zoom meeting ID & passcode when URL changes
  const handleMeetingUrlChange = useCallback(
    (url: string) => {
      setMeetingUrl(url);
      if (liveProvider === "ZOOM" && url.includes("zoom")) {
        const parsed = parseZoomUrl(url);
        if (parsed.meetingId) setMeetingId(parsed.meetingId);
        if (parsed.passcode) setMeetingPasscode(parsed.passcode);
      }
    },
    [liveProvider],
  );

  const resetForm = () => {
    setClassTitle("");
    setVideoLink("");
    setVideoType("DRIVE");
    setSelectedFolder("");
    setFolderName("");
    setClassType("RECORDED");
    setLiveProvider("ZOOM");
    setMeetingUrl("");
    setMeetingId("");
    setMeetingPasscode("");
    setStartTime("");
    setEndTime("");
  };

  const handleCreateClass = async () => {
    if (!classTitle.trim()) {
      toast.error("Please enter a class title");
      return;
    }
    if (classType === "LIVE") {
      if (!meetingUrl.trim()) {
        toast.error("Please enter a meeting URL");
        return;
      }
      if (!startTime || !endTime) {
        toast.error("Please set start and end times");
        return;
      }
      if (new Date(endTime) <= new Date(startTime)) {
        toast.error("End time must be after start time");
        return;
      }
    }

    setTextValue("Creating...");
    try {
      const result = await createClass.mutateAsync({
        classTitle,
        videoLink: classType === "RECORDED" ? videoLink : meetingUrl,
        videoType:
          classType === "LIVE"
            ? "ZOOM"
            : (videoType as "DRIVE" | "ZOOM" | "YOUTUBE"),
        courseId,
        createdAt,
        folderId: selectedFolder !== "new" ? selectedFolder : undefined,
        folderName: selectedFolder === "new" ? folderName.trim() : undefined,
        classType,
        liveProvider: classType === "LIVE" ? liveProvider : null,
        startTime: classType === "LIVE" && startTime ? startTime : null,
        endTime: classType === "LIVE" && endTime ? endTime : null,
        meetingUrl: classType === "LIVE" ? meetingUrl : null,
        meetingId: classType === "LIVE" ? meetingId || null : null,
        meetingPasscode: classType === "LIVE" ? meetingPasscode || null : null,
      });

      if (result) {
        toast.success("Class added successfully");
        resetForm();
        setIsOpen(false);
        router.push(`/courses/class?id=${courseId}&classId=${result.id}`);
      }
    } catch {
      toast.error("Failed to add new class");
    } finally {
      setTextValue("Create Class");
      router.refresh();
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
          <MdOndemandVideo className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add New Class</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-3">
          {/* Class Type */}
          <RadioGroup
            value={classType}
            onValueChange={(v) => setClassType(v as "RECORDED" | "LIVE")}
            className="flex gap-3"
          >
            <label
              htmlFor="type-recorded"
              className={`flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                classType === "RECORDED"
                  ? "border-foreground/30 bg-muted"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="RECORDED" id="type-recorded" />
              <Video className="h-4 w-4" />
              Recorded
            </label>
            <label
              htmlFor="type-live"
              className={`flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                classType === "LIVE"
                  ? "border-foreground/30 bg-muted"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="LIVE" id="type-live" />
              <Radio className="h-4 w-4" />
              Live
            </label>
          </RadioGroup>

          <Input
            type="text"
            placeholder="Class title"
            value={classTitle}
            onChange={(e) => setClassTitle(e.target.value)}
          />

          {/* Recorded fields */}
          {classType === "RECORDED" && (
            <>
              <Select value={videoType} onValueChange={setVideoType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Video type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRIVE">Drive</SelectItem>
                  <SelectItem value="YOUTUBE">YouTube</SelectItem>
                  <SelectItem value="ZOOM">Zoom Recording</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="text"
                placeholder="Video link"
                value={videoLink}
                onChange={(e) => setVideoLink(e.target.value)}
              />
            </>
          )}

          {/* Live fields */}
          {classType === "LIVE" && (
            <>
              <RadioGroup
                value={liveProvider}
                onValueChange={(v) =>
                  setLiveProvider(v as "ZOOM" | "GOOGLE_MEET")
                }
                className="flex gap-3"
              >
                <label
                  htmlFor="provider-zoom"
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    liveProvider === "ZOOM"
                      ? "border-foreground/30 bg-muted"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem
                    value="ZOOM"
                    id="provider-zoom"
                    className="sr-only"
                  />
                  <Video className="h-3.5 w-3.5" />
                  Zoom
                </label>
                <label
                  htmlFor="provider-meet"
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    liveProvider === "GOOGLE_MEET"
                      ? "border-foreground/30 bg-muted"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem
                    value="GOOGLE_MEET"
                    id="provider-meet"
                    className="sr-only"
                  />
                  <Phone className="h-3.5 w-3.5" />
                  Google Meet
                </label>
              </RadioGroup>

              <Input
                type="url"
                placeholder={
                  liveProvider === "ZOOM"
                    ? "Paste Zoom meeting link"
                    : "Paste Google Meet link"
                }
                value={meetingUrl}
                onChange={(e) => handleMeetingUrlChange(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="text"
                  placeholder="Meeting ID"
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Passcode"
                  value={meetingPasscode}
                  onChange={(e) => setMeetingPasscode(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    Start time
                  </Label>
                  <Input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    End time
                  </Label>
                  <Input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <Input
            type="date"
            value={createdAt}
            onChange={(e) => setCreatedAt(e.target.value)}
          />

          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger>
              <SelectValue placeholder="Folder (optional)" />
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
              placeholder="Folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
            />
          )}

          <Button
            disabled={!classTitle || textValue === "Creating..."}
            className="w-full cursor-pointer gap-2"
            onClick={handleCreateClass}
          >
            <Plus className="h-4 w-4" />
            {textValue}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewClassDialog;
