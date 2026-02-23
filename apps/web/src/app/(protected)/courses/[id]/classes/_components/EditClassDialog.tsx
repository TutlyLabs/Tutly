"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Video, Phone, Radio } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
    classType?: string;
    liveProvider?: string | null;
    startTime?: Date | null;
    endTime?: Date | null;
    meetingUrl?: string | null;
    meetingId?: string | null;
    meetingPasscode?: string | null;
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

function parseZoomUrl(url: string): {
  meetingId: string;
  passcode: string;
} {
  const result = { meetingId: "", passcode: "" };
  try {
    const idMatch = url.match(/\/j\/(\d+)/);
    if (idMatch?.[1]) {
      const raw = idMatch[1];
      result.meetingId = raw.replace(/(\d{3})(\d{4})(\d{4})/, "$1 $2 $3");
    }
    const urlObj = new URL(url);
    const pwd = urlObj.searchParams.get("pwd");
    if (pwd) result.passcode = pwd;
  } catch {
    // ignore
  }
  return result;
}

const formatDateTimeLocal = (date: Date | null | undefined): string => {
  if (!date) return "";
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const EditClassDialog = ({
  isOpen,
  onOpenChange,
  courseId,
  classDetails,
}: EditClassDialogProps) => {
  const [classTitle, setClassTitle] = useState("");
  const [textValue, setTextValue] = useState("Update Class");
  const [folderName, setFolderName] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [createdAt, setCreatedAt] = useState(
    new Date().toISOString().split("T")[0],
  );
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
      setClassType(
        (classDetails.classType as "RECORDED" | "LIVE") || "RECORDED",
      );
      setLiveProvider(
        (classDetails.liveProvider as "ZOOM" | "GOOGLE_MEET") || "ZOOM",
      );
      setMeetingUrl(classDetails.meetingUrl ?? "");
      setMeetingId(classDetails.meetingId ?? "");
      setMeetingPasscode(classDetails.meetingPasscode ?? "");
      setStartTime(formatDateTimeLocal(classDetails.startTime));
      setEndTime(formatDateTimeLocal(classDetails.endTime));
    }
  }, [classDetails]);

  useEffect(() => {
    if (getFolders.data) setFolders(getFolders.data);
  }, [getFolders.data]);

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

  const handleUpdateClass = async () => {
    if (!classTitle.trim()) {
      toast.error("Please fill all necessary fields");
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

    setTextValue("Updating...");
    try {
      await updateClass.mutateAsync({
        classId: classDetails.id,
        courseId,
        classTitle: classTitle.trim(),
        videoLink:
          classType === "RECORDED" ? videoLink || null : meetingUrl || null,
        videoType:
          classType === "LIVE"
            ? "ZOOM"
            : (videoType as "DRIVE" | "ZOOM" | "YOUTUBE"),
        createdAt,
        folderId:
          selectedFolder === "none"
            ? undefined
            : selectedFolder === "new"
              ? undefined
              : selectedFolder,
        folderName: selectedFolder === "new" ? folderName.trim() : undefined,
        classType,
        liveProvider: classType === "LIVE" ? liveProvider : null,
        startTime: classType === "LIVE" && startTime ? startTime : null,
        endTime: classType === "LIVE" && endTime ? endTime : null,
        meetingUrl: classType === "LIVE" ? meetingUrl : null,
        meetingId: classType === "LIVE" ? meetingId || null : null,
        meetingPasscode: classType === "LIVE" ? meetingPasscode || null : null,
      });

      toast.success("Class updated successfully");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Failed to update class");
    } finally {
      setTextValue("Update Class");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit Class</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-3">
          {/* Class Type */}
          <RadioGroup
            value={classType}
            onValueChange={(v) => setClassType(v as "RECORDED" | "LIVE")}
            className="flex gap-3"
          >
            <label
              htmlFor="edit-type-recorded"
              className={`flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                classType === "RECORDED"
                  ? "border-foreground/30 bg-muted"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="RECORDED" id="edit-type-recorded" />
              <Video className="h-4 w-4" />
              Recorded
            </label>
            <label
              htmlFor="edit-type-live"
              className={`flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                classType === "LIVE"
                  ? "border-foreground/30 bg-muted"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="LIVE" id="edit-type-live" />
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
                  htmlFor="edit-provider-zoom"
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    liveProvider === "ZOOM"
                      ? "border-foreground/30 bg-muted"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem
                    value="ZOOM"
                    id="edit-provider-zoom"
                    className="sr-only"
                  />
                  <Video className="h-3.5 w-3.5" />
                  Zoom
                </label>
                <label
                  htmlFor="edit-provider-meet"
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    liveProvider === "GOOGLE_MEET"
                      ? "border-foreground/30 bg-muted"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem
                    value="GOOGLE_MEET"
                    id="edit-provider-meet"
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
              placeholder="Folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
            />
          )}

          <Button
            disabled={!classTitle || textValue === "Updating..."}
            className="w-full cursor-pointer gap-2"
            onClick={handleUpdateClass}
          >
            <Plus className="h-4 w-4" />
            {textValue}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditClassDialog;
