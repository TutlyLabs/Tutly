"use client";

import type { Attachment } from "@/lib/prisma";
import { FileType } from "@/lib/prisma";
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
import { ExternalLink } from "lucide-react";
import { RiEdit2Fill } from "react-icons/ri";
import { useDebounce } from "use-debounce";
import { useRouter } from "next/navigation";

import VideoPlayer from "./videoEmbeds/VideoPlayer";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";

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
}

export default function Class({
  courseId,
  classId,
  currentUser,
  initialNotesData,
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

  const { video, title, createdAt, attachments } = classDetails.data;
  const { videoLink, videoType } = video ?? {};
  const isBookmarked = !!bookmarkData?.data;

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
        <Link href={`/assignments/${attachment.id}`}>
          <ExternalLink className="m-auto h-4 w-4" />
        </Link>
      );
    }

    if (attachment.link) {
      return (
        <Link href={attachment.link} className="text-sm">
          <ExternalLink className="m-auto h-4 w-4" />
        </Link>
      );
    }

    return "No link";
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
      router.push(`/courses/${courseId}`);
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
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag("");
    }
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
    <div className="flex flex-col gap-2 md:mx-5">
      <div className="flex flex-wrap gap-6">
        <div className="flex-1">
          <div className="h-full w-full rounded-xl p-2">
            <div>
              <div className="mb-2 flex w-full items-center justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-semibold">{title}</p>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openVideoInNewTab}
                      className="flex cursor-pointer items-center gap-2 hover:bg-blue-500/10"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-xs">Open Video</span>
                    </Button>

                    {haveAdminAccess &&
                      attendanceData?.data?.attendance?.length === 0 && (
                        <>
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1.5 bg-gray-500/10 text-gray-700 hover:bg-gray-500/20 dark:text-gray-400"
                          >
                            <FaClock className="h-3 w-3" />
                            <span className="text-xs font-medium">
                              Not Marked Yet
                            </span>
                          </Badge>
                          <Link
                            href={`/tutor/attendance?courseId=${courseId}&classId=${classId}`}
                            target="_blank"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex cursor-pointer items-center gap-2 hover:bg-blue-500/10"
                            >
                              <FaUpload className="h-3.5 w-3.5" />
                              <span className="text-xs">Upload Attendance</span>
                            </Button>
                          </Link>
                        </>
                      )}

                    {haveAdminAccess && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsEditClassDialogOpen(true)}
                          className="hover:bg-secondary/80"
                        >
                          <RiEdit2Fill className="h-5 w-5" />
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
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <FaTrash className="h-5 w-5" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleBookMark}
                      className="hover:bg-secondary/80"
                    >
                      {isBookmarked ? (
                        <FaBookmark className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <FaRegBookmark className="h-5 w-5" />
                      )}
                    </Button>

                    {currentUser.role === "STUDENT" && (
                      <StudentAttendanceIndicator
                        courseId={courseId}
                        attendance={studentAttendanceData?.data || undefined}
                        attendanceUploaded={
                          studentAttendanceData?.attendanceUploaded || false
                        }
                      />
                    )}
                  </div>
                </div>
                <p className="text-sm font-medium whitespace-nowrap">
                  {dayjs(createdAt).format("MMM D, YYYY")}
                </p>
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
              <div className="text-secondary-100 aspect-video w-full flex-1 rounded-xl bg-gray-500/10 object-cover">
                {renderVideo()}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full pb-4 md:m-0 md:w-96">
          <div className="h-full w-full rounded-xl p-2">
            {haveAdminAccess && (
              <div className="mb-4 flex w-full justify-end">
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

            <table className="w-full border-collapse">
              <thead className="border-secondary-400 mb-4 border-b-2 font-semibold">
                <tr>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Link</th>
                  <th className="px-4 py-2">Due Date</th>
                  {haveAdminAccess && <th className="px-4 py-2">Actions</th>}
                </tr>
              </thead>
              <tbody className="text-white">
                {!attachments?.length ? (
                  <tr className="bg-blue-500 text-center">
                    <td className="py-4 text-center text-lg" colSpan={4}>
                      No assignments
                    </td>
                  </tr>
                ) : (
                  attachments.map((attachment, index) => (
                    <tr className="bg-blue-500 text-center" key={index}>
                      <td className="px-4 py-2">
                        <div className="font-semibold">
                          {attachment.title}
                          <div className="text-sm font-medium text-neutral-300">
                            {attachment.attachmentType.toLowerCase()}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {renderAttachmentLink(attachment)}
                      </td>
                      <td className="px-4 py-2">
                        {attachment.attachmentType === "ASSIGNMENT" &&
                        attachment.dueDate
                          ? dayjs(attachment.dueDate).format("MMM D, YYYY")
                          : "-"}
                      </td>
                      {haveAdminAccess && (
                        <td className="px-4 py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <BsThreeDotsVertical className="h-5 w-5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedAttachment(attachment);
                                  setIsEditAssignmentDialogOpen(true);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <FaPencilAlt className="h-4 w-4" />
                                  Edit
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedAttachment(attachment);
                                  setIsDeleteAssignmentDialogOpen(true);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <FaTrashAlt className="h-4 w-4" />
                                  Delete
                                </div>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="w-full rounded-xl bg-transparent shadow-lg">
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FaStickyNote className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Class Notes</h2>
          </div>
          <div className="flex flex-1 items-center gap-2">
            <FaTags className="h-5 w-5 text-blue-600" />
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-1"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-xs hover:text-red-500"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Add tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  className="h-8 w-32"
                />
                <Button variant="outline" size="sm" onClick={addTag}>
                  Add
                </Button>
              </div>
            </div>
          </div>
          <div className="text-muted-foreground text-sm whitespace-nowrap">
            {notesStatus && <span>{notesStatus}</span>}
            {lastSaved && (
              <span> • Last saved {dayjs(lastSaved).fromNow()}</span>
            )}
          </div>
          {notes && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearNotesDialogOpen(true)}
              className="text-red-500 hover:bg-red-100/10 hover:text-red-600"
            >
              <FaTrash className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
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
