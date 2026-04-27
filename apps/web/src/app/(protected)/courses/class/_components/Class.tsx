"use client";

import type { Attachment } from "@tutly/db/browser";
import { FileType } from "@tutly/db/browser";
import dayjs from "dayjs";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { BsThreeDotsVertical } from "react-icons/bs";
import Link from "next/link";
import {
  FaBookmark,
  FaClock,
  FaPencilAlt,
  FaPlus,
  FaRegBookmark,
  FaStickyNote,
  FaTags,
  FaTrash,
  FaTrashAlt,
  FaUpload,
} from "react-icons/fa";
import { ExternalLink, Menu } from "lucide-react";
import { RiEdit2Fill } from "react-icons/ri";
import { useDebounce } from "use-debounce";
import { useRouter } from "next/navigation";

import VideoPlayer from "./videoEmbeds/VideoPlayer";
import LiveClassBanner from "./LiveClassBanner";
import RichTextEditor from "@/components/editor/RichTextEditor";
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
import { Badge } from "@tutly/ui/badge";
import { Button } from "@tutly/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@tutly/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@tutly/ui/dropdown-menu";
import { Input } from "@tutly/ui/input";
import { ScrollArea } from "@tutly/ui/scroll-area";
import { api } from "@/trpc/react";
import { Skeleton } from "@tutly/ui/skeleton";

import EditClassDialog from "./EditClassDialog";
import NewAttachmentPage from "./NewAssignments";
import AttendanceIndicator from "./AttendanceIndicator";
import StudentAttendanceIndicator from "./StudentAttendanceIndicator";

interface ClassProps {
  courseId: string;
  classId: string;
  currentUser: {
    id: string;
    role: string;
    username: string;
    adminForCourses?: { id: string }[];
  };
  initialNotesData?: any;
  onOpenClassMenu?: () => void;
}

export default function Class({
  courseId,
  classId,
  currentUser,
  initialNotesData,
  onOpenClassMenu,
}: ClassProps) {
  const [selectedAttachment, setSelectedAttachment] =
    useState<Attachment | null>(null);
  const [isAddAssignmentDialogOpen, setIsAddAssignmentDialogOpen] =
    useState(false);
  const [isEditAssignmentDialogOpen, setIsEditAssignmentDialogOpen] =
    useState(false);
  const [isDeleteAssignmentDialogOpen, setIsDeleteAssignmentDialogOpen] =
    useState(false);
  const [isEditClassDialogOpen, setIsEditClassDialogOpen] = useState(false);
  const [isDeleteClassDialogOpen, setIsDeleteClassDialogOpen] = useState(false);
  const [classDeletionInfo, setClassDeletionInfo] = useState<{
    attachmentsCount: number;
    attendanceCount: number;
    notesCount: number;
    totalSubmissions: number;
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [notesJson, setNotesJson] = useState<any>(null);
  const [debouncedNotes] = useDebounce(notes, 1000);
  const [debouncedNotesJson] = useDebounce(notesJson, 1000);
  const [notesStatus, setNotesStatus] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const router = useRouter();
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [isClearNotesDialogOpen, setIsClearNotesDialogOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const prevValuesRef = useRef<{
    description: string;
    descriptionJson: any;
    tags: string[];
  } | null>(null);

  const { data: classes } = api.classes.getClassesByCourseId.useQuery({
    courseId,
  });
  const { data: classDetails } = api.classes.getClassDetails.useQuery({
    id: classId,
  });
  const { data: notesData } = api.notes.getNote.useQuery({
    userId: currentUser.id,
    objectId: classId,
  });
  const { data: bookmarkData } = api.bookmarks.getBookmark.useQuery({
    userId: currentUser.id,
    objectId: classId,
  });

  const { data: attendanceData } =
    api.attendances.viewAttendanceByClassId.useQuery(
      { classId },
      { enabled: currentUser.role !== "STUDENT" },
    );

  const { data: studentAttendanceData } =
    api.attendances.getStudentAttendanceByClassId.useQuery(
      { classId },
      { enabled: currentUser.role === "STUDENT" },
    );

  useEffect(() => {
    // Use initialNotesData if available, otherwise fall back to notesData query
    const dataToUse = initialNotesData || notesData;
    if (dataToUse?.data) {
      const description = dataToUse.data.description ?? "";
      const descriptionJson = dataToUse.data.descriptionJson ?? null;
      const tagsData = dataToUse.data.tags ?? [];

      setNotes(description);
      setNotesJson(descriptionJson);
      setTags(tagsData);

      prevValuesRef.current = {
        description,
        descriptionJson,
        tags: tagsData,
      };
    }
  }, [initialNotesData, notesData]);

  const updateNote = api.notes.updateNote.useMutation();
  const toggleBookmark = api.bookmarks.toggleBookmark.useMutation();
  const deleteAttachment = api.attachments.deleteAttachment.useMutation();
  const deleteClass = api.classes.deleteClass.useMutation();
  const { refetch: fetchClassDeletionInfo } =
    api.classes.getClassDeletionInfo.useQuery({ classId }, { enabled: false });

  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }

    const timer = setTimeout(() => {
      const saveNotes = async () => {
        if (!debouncedNotesJson) {
          return;
        }

        if (prevValuesRef.current) {
          const hasJsonChanged =
            JSON.stringify(debouncedNotesJson) !==
            JSON.stringify(prevValuesRef.current.descriptionJson);
          const hasTagsChanged =
            JSON.stringify(tags) !== JSON.stringify(prevValuesRef.current.tags);

          if (!hasJsonChanged && !hasTagsChanged) {
            return;
          }
        }

        try {
          setNotesStatus("Saving...");
          updateNote.mutate({
            objectId: classId,
            category: "CLASS",
            description: null,
            descriptionJson: debouncedNotesJson,
            tags: tags,
            causedObjects: { classId: classId, courseId: courseId },
          });

          prevValuesRef.current = {
            description: "",
            descriptionJson: debouncedNotesJson,
            tags: tags,
          };

          setLastSaved(new Date());
          setNotesStatus("Saved");
        } catch (error) {
          setNotesStatus("Failed to save");
        }
      };

      void saveNotes();
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    debouncedNotes,
    debouncedNotesJson,
    classId,
    tags,
    isInitialLoad,
    updateNote,
    courseId,
    notesData,
  ]);

  if (!classDetails?.data) {
    return (
      <div className="flex flex-col gap-2 md:mx-5">
        {/* Class Header */}
        <div className="flex flex-wrap gap-6">
          <div className="flex-1">
            <div className="h-full w-full rounded-xl p-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="aspect-video w-full rounded-xl" />
              </div>
            </div>
          </div>

          <div className="w-full pb-4 md:m-0 md:w-96">
            <div className="h-full w-full rounded-xl p-2">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Skeleton className="h-10 w-40" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="w-full rounded-xl bg-transparent p-4 shadow-lg">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const {
    video,
    title,
    createdAt,
    attachments,
    classType,
    liveProvider,
    startTime,
    endTime,
    meetingUrl,
    meetingId,
    meetingPasscode,
  } = classDetails.data;
  const { videoLink, videoType } = video ?? {};
  const isBookmarked = !!bookmarkData?.data;
  const isLiveClass = classType === "LIVE";

  const isCourseAdmin = currentUser?.adminForCourses?.some(
    (course: { id: string }) => course.id === courseId,
  );
  const haveAdminAccess = currentUser.role == "INSTRUCTOR" || isCourseAdmin;

  const getVideoId = () => {
    if (!videoLink || !videoType) return null;

    const PATTERNS = {
      YOUTUBE:
        /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      DRIVE: /\/file\/d\/([^\/]+)/,
    };

    const pattern = PATTERNS[videoType as keyof typeof PATTERNS];
    if (!pattern) return null;

    const match = videoLink.match(pattern);
    return match ? match[1] : null;
  };

  const videoId = getVideoId();

  const openVideoInNewTab = () => {
    if (isLiveClass && meetingUrl) {
      window.open(meetingUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (!videoId || !videoType) return;
    const url =
      videoType === "DRIVE"
        ? `https://drive.google.com/file/d/${videoId}/view`
        : `https://www.youtube.com/watch?v=${videoId}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const renderVideo = () => {
    if (!videoId) {
      return (
        <span className="text-muted-foreground flex h-full items-center justify-center text-sm">
          No video to display
        </span>
      );
    }

    return (
      <VideoPlayer
        videoId={videoId}
        videoType={videoType as "YOUTUBE" | "DRIVE"}
      />
    );
  };

  const renderAttachmentLink = (attachment: Attachment) => {
    if (attachment.attachmentType === "ASSIGNMENT") {
      return (
        <Link
          href={`/assignments/detail?id=${attachment.id}`}
          aria-label="Open assignment"
          title="Open assignment"
          className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      );
    }

    if (attachment.link) {
      return (
        <Link
          href={attachment.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open link"
          title="Open link"
          className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      );
    }

    return null;
  };

  const handleDelete = async () => {
    try {
      if (!selectedAttachment?.id) return;
      await deleteAttachment.mutateAsync({
        id: selectedAttachment.id,
      });
      toast.success("Assignment deleted successfully");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete assignment");
    }
  };

  const handleDeleteClass = async () => {
    try {
      await deleteClass.mutateAsync({
        classId: classId,
      });
      toast.success("Class deleted successfully");
      setIsDeleteClassDialogOpen(false);
      router.push(`/courses/detail?id=${courseId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete class",
      );
    }
  };

  const toggleBookMark = async () => {
    try {
      const response = await toggleBookmark.mutateAsync({
        objectId: classId,
        category: "CLASS",
        causedObjects: { classId: classId, courseId: courseId },
      });

      if (!response.success) {
        toast.error("failed to add bookmark");
      } else {
        toast.success(isBookmarked ? "Bookmark removed" : "Bookmark added");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to toggle bookmark");
    }
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag("");
    }
    setIsAddingTag(false);
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleClearNotes = async () => {
    try {
      setNotesStatus("Clearing...");
      setNotes("");
      setNotesJson(null);

      updateNote.mutate({
        objectId: classId,
        category: "CLASS",
        description: null,
        descriptionJson: null,
        tags: [],
        causedObjects: { classId: classId, courseId: courseId },
      });

      setTags([]);
      setLastSaved(new Date());
      setNotesStatus("Cleared");
      setIsClearNotesDialogOpen(false);
      toast.success("Notes cleared successfully");
      router.refresh();
    } catch (error) {
      setNotesStatus("Failed to clear");
      toast.error("Failed to clear notes");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="min-w-0 flex-1">
          <div className="h-full w-full">
            <div>
              {/* Title + meta — single row, compact */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {onOpenClassMenu && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onOpenClassMenu}
                      className="hover:bg-accent -ml-1 h-8 w-8 shrink-0"
                      aria-label="Open class list"
                      title="Classes"
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  )}
                  <h1 className="text-foreground min-w-0 truncate text-lg font-semibold sm:text-xl">
                    {title}
                  </h1>
                  <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
                    <span className="hidden sm:inline">
                      · {dayjs(createdAt).format("MMM D, YYYY")}
                    </span>
                    <span className="sm:hidden">
                      · {dayjs(createdAt).format("MMM D")}
                    </span>
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {currentUser.role === "STUDENT" && (
                    <StudentAttendanceIndicator
                      courseId={courseId}
                      attendance={studentAttendanceData?.data || undefined}
                      attendanceUploaded={
                        studentAttendanceData?.attendanceUploaded || false
                      }
                    />
                  )}

                  {haveAdminAccess &&
                    attendanceData?.data?.attendance?.length === 0 && (
                      <Badge
                        variant="outline"
                        className="bg-muted/40 h-7 gap-1 text-[11px]"
                      >
                        <FaClock className="h-3 w-3" />
                        Not marked
                      </Badge>
                    )}

                  {!isLiveClass && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={openVideoInNewTab}
                      className="hover:bg-accent h-8 w-8"
                      aria-label="Open video"
                      title="Open video"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleBookMark}
                    className="hover:bg-accent h-8 w-8"
                    aria-label={
                      isBookmarked ? "Remove bookmark" : "Add bookmark"
                    }
                    title={isBookmarked ? "Bookmarked" : "Bookmark"}
                  >
                    {isBookmarked ? (
                      <FaBookmark className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <FaRegBookmark className="h-4 w-4" />
                    )}
                  </Button>

                  {haveAdminAccess &&
                    attendanceData?.data?.attendance?.length === 0 && (
                      <Link
                        href={`/tutor/attendance?courseId=${courseId}&classId=${classId}`}
                        target="_blank"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-accent h-8 w-8"
                          aria-label="Upload attendance"
                          title="Upload attendance"
                        >
                          <FaUpload className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}

                  {haveAdminAccess && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsEditClassDialogOpen(true)}
                        className="hover:bg-accent h-8 w-8"
                        aria-label="Edit class"
                        title="Edit class"
                      >
                        <RiEdit2Fill className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          const result = await fetchClassDeletionInfo();
                          if (result.data?.success) {
                            setClassDeletionInfo(result.data.data);
                          }
                          setIsDeleteClassDialogOpen(true);
                        }}
                        className="text-destructive hover:bg-destructive/10 h-8 w-8"
                        aria-label="Delete class"
                      >
                        <FaTrash className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {currentUser.role !== "STUDENT" && (
                <div className="mb-2 max-w-[710px] overflow-x-auto">
                  <AttendanceIndicator
                    classId={classId}
                    attendance={attendanceData?.data?.attendance || []}
                    present={attendanceData?.data?.present || 0}
                    totalEnrolledStudents={
                      attendanceData?.data?.totalEnrolledStudents || 0
                    }
                    notAttendedStudents={
                      attendanceData?.data?.notAttendedStudents || []
                    }
                    role={currentUser.role}
                    courseId={courseId}
                  />
                </div>
              )}
              <div className="bg-muted/40 aspect-video w-full flex-1 overflow-hidden rounded-xl object-cover">
                {isLiveClass ? (
                  <LiveClassBanner
                    title={title}
                    liveProvider={liveProvider ?? null}
                    startTime={startTime ?? null}
                    endTime={endTime ?? null}
                    meetingUrl={meetingUrl ?? null}
                    meetingId={meetingId ?? null}
                    meetingPasscode={meetingPasscode ?? null}
                    isAdmin={haveAdminAccess}
                  />
                ) : (
                  renderVideo()
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:m-0 md:w-96">
          <div className="h-full w-full">
            {haveAdminAccess && (
              <div className="mb-3 flex w-full justify-end">
                <Dialog
                  open={isAddAssignmentDialogOpen}
                  onOpenChange={setIsAddAssignmentDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2 text-white">
                      Add an assignment
                      <FaPlus />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] min-w-[70vw] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>Add Assignment</DialogTitle>
                      <DialogDescription>
                        Create a new assignment for this class.
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] overflow-y-auto">
                      <NewAttachmentPage
                        classes={classes?.data}
                        courseId={courseId}
                        classId={classId}
                        onCancel={() => {
                          setIsAddAssignmentDialogOpen(false);
                        }}
                        onComplete={() => {
                          router.refresh();
                        }}
                      />
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
              <div className="text-muted-foreground border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide">
                Assignments
              </div>
              {!attachments?.length ? (
                <div className="text-muted-foreground py-6 text-center text-sm">
                  No assignments
                </div>
              ) : (
                <ul className="divide-border divide-y">
                  {attachments.map((attachment, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-medium">
                          {attachment.title}
                        </p>
                        <p className="text-muted-foreground mt-0.5 truncate text-[11px] capitalize">
                          {attachment.attachmentType.toLowerCase()}
                          {attachment.attachmentType === "ASSIGNMENT" &&
                            attachment.dueDate &&
                            ` · Due ${dayjs(attachment.dueDate).format("MMM D, YYYY")}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {renderAttachmentLink(attachment)}
                        {haveAdminAccess && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-accent h-7 w-7 cursor-pointer"
                                aria-label="Attachment options"
                              >
                                <BsThreeDotsVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedAttachment(attachment);
                                  setIsEditAssignmentDialogOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <FaPencilAlt className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive cursor-pointer"
                                onClick={() => {
                                  setSelectedAttachment(attachment);
                                  setIsDeleteAssignmentDialogOpen(true);
                                }}
                              >
                                <FaTrashAlt className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="w-full">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <div className="flex shrink-0 items-center gap-2">
              <FaStickyNote className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
              <h2 className="text-foreground text-base font-semibold sm:text-lg">
                Class Notes
              </h2>
            </div>
            {tags.length > 0 && (
              <span className="bg-border hidden h-4 w-px sm:inline-block" />
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="h-6 gap-1.5 px-2 text-[11px]"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-destructive text-xs leading-none"
                    aria-label={`Remove ${tag}`}
                  >
                    ×
                  </button>
                </Badge>
              ))}
              {isAddingTag ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    ref={tagInputRef}
                    type="text"
                    autoFocus
                    placeholder="Tag name…"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addTag();
                      if (e.key === "Escape") {
                        setNewTag("");
                        setIsAddingTag(false);
                      }
                    }}
                    onBlur={() => {
                      if (!newTag.trim()) setIsAddingTag(false);
                    }}
                    className="h-7 w-28 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addTag}
                    className="h-7 px-2 text-xs"
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingTag(true)}
                  className="text-muted-foreground hover:text-foreground h-7 gap-1 px-2 text-[11px]"
                >
                  <FaTags className="h-3 w-3" />
                  Add tag
                </Button>
              )}
            </div>
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            {notesStatus && <span>{notesStatus}</span>}
            {lastSaved && (
              <span className="hidden sm:inline">
                Last saved {dayjs(lastSaved).fromNow()}
              </span>
            )}
            {notes && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsClearNotesDialogOpen(true)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 gap-1 px-2 text-xs"
              >
                <FaTrash className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {initialNotesData || notesData ? (
          <RichTextEditor
            initialValue={notesJson ?? notes ?? ""}
            onChange={(jsonValue: string) => {
              setNotesJson(jsonValue ? JSON.parse(jsonValue) : null);
            }}
            height="min-h-[200px]"
            allowUpload={true}
            fileUploadOptions={{
              fileType: FileType.NOTES,
              associatingId: classId,
              allowedExtensions: ["jpeg", "jpg", "png", "gif", "svg", "webp"],
            }}
          />
        ) : (
          <div className="bg-muted/50 flex min-h-[200px] items-center justify-center rounded-md border">
            <div className="text-muted-foreground">Loading notes...</div>
          </div>
        )}
      </div>

      {/* Edit class Dialog */}
      <EditClassDialog
        isOpen={isEditClassDialogOpen}
        onOpenChange={setIsEditClassDialogOpen}
        courseId={courseId}
        classDetails={classDetails.data}
      />

      {/* Edit Assignment Dialog */}
      <Dialog
        open={isEditAssignmentDialogOpen}
        onOpenChange={setIsEditAssignmentDialogOpen}
      >
        <DialogContent className="max-h-[90vh] min-w-[70vw] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Modify the details of the selected assignment.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] overflow-y-auto">
            <NewAttachmentPage
              classes={classes?.data}
              courseId={courseId}
              classId={classId}
              isEditing
              attachment={selectedAttachment ?? undefined}
              onCancel={() => {
                setIsEditAssignmentDialogOpen(false);
              }}
              onComplete={() => {
                setIsEditAssignmentDialogOpen(false);
                router.refresh();
              }}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog
        open={isDeleteAssignmentDialogOpen}
        onOpenChange={setIsDeleteAssignmentDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              assignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Notes Alert Dialog */}
      <AlertDialog
        open={isClearNotesDialogOpen}
        onOpenChange={setIsClearNotesDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Notes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your notes for this class. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearNotes}
              className="bg-red-600 hover:bg-red-700"
            >
              Clear Notes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Class Alert Dialog */}
      <AlertDialog
        open={isDeleteClassDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteClassDialogOpen(open);
          if (!open) {
            setClassDeletionInfo(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to delete &quot;{title}&quot;? This
                  action cannot be undone.
                </p>
                {classDeletionInfo ? (
                  <div className="bg-destructive/10 space-y-2 rounded-md p-4">
                    <p className="text-destructive font-semibold">
                      This will permanently delete:
                    </p>
                    <ul className="text-foreground list-inside list-disc space-y-1 text-sm">
                      <li>
                        {classDeletionInfo.attachmentsCount}{" "}
                        {classDeletionInfo.attachmentsCount === 1
                          ? "attachment"
                          : "attachments"}
                      </li>
                      {classDeletionInfo.totalSubmissions > 0 && (
                        <li>
                          {classDeletionInfo.totalSubmissions}{" "}
                          {classDeletionInfo.totalSubmissions === 1
                            ? "submission"
                            : "submissions"}
                        </li>
                      )}
                      <li>
                        {classDeletionInfo.attendanceCount} attendance{" "}
                        {classDeletionInfo.attendanceCount === 1
                          ? "record"
                          : "records"}
                      </li>
                      <li>
                        {classDeletionInfo.notesCount}{" "}
                        {classDeletionInfo.notesCount === 1 ? "note" : "notes"}
                      </li>
                      <li>Video and all class data</li>
                    </ul>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Loading deletion information...
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClass}
              disabled={!classDeletionInfo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
