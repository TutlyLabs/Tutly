"use client";

import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BiSolidCloudUpload } from "react-icons/bi";
import { MdDeleteOutline } from "react-icons/md";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/trpc/react";

import BulkImport from "@/components/table/BulkImport";
import type { Column } from "@/components/table/DisplayTable";

const columns: Column[] = [
  {
    key: "Name",
    name: "Name",
    label: "Name",
    type: "text",
    sortable: true,
    filterable: true,
    validation: {
      required: true,
      message: "Name must be a string",
    },
  },
  {
    key: "UserEmail",
    name: "Email",
    label: "Email",
    type: "email",
    sortable: true,
    filterable: true,
    validation: {
      required: false,
      regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Must be a valid email address",
    },
  },
  {
    key: "JoinTime",
    name: "Join Time",
    label: "Join Time",
    type: "datetime-local",
    sortable: true,
    filterable: true,
    validation: {
      required: true,
      message: "Join time is required",
    },
  },
  {
    key: "LeaveTime",
    name: "Leave Time",
    label: "Leave Time",
    type: "datetime-local",
    sortable: true,
    filterable: true,
    validation: {
      required: true,
      message: "Leave time is required",
    },
  },
  {
    key: "Duration",
    name: "Duration",
    label: "Duration (Minutes)",
    type: "number",
    sortable: true,
    filterable: true,
    validation: {
      required: true,
      regex: /^\d+$/,
      message: "Duration must be a positive number",
    },
  },
  {
    key: "Guest",
    name: "Guest",
    label: "Guest",
    type: "text",
    sortable: true,
    filterable: true,
    validation: {
      required: false,
    },
  },
  {
    key: "RecordingDisclaimerResponse",
    name: "Recording Consent",
    label: "Recording Consent",
    type: "text",
    sortable: true,
    filterable: true,
    validation: {
      required: false,
    },
  },
  {
    key: "InWaitingRoom",
    name: "Waiting Room",
    label: "In Waiting Room",
    type: "text",
    sortable: true,
    filterable: true,
    validation: {
      required: false,
    },
  },
  {
    key: "username",
    name: "Username",
    label: "Username",
    type: "text",
    sortable: true,
    filterable: true,
    validation: {
      required: false,
    },
    render: (_: unknown, row: Record<string, unknown>) => {
      return String(row.Name).substring(0, 10).toUpperCase();
    },
  },
];

interface AttendanceHeaderProps {
  role: string;
  pastpresentStudents: any[];
  courses: any[];
  currentCourse: any;
  setCurrentCourse: (course: any) => void;
  currentClass: any;
  setCurrentClass: (class_: any) => void;
  onSelectFile: (file: Blob) => void;
  fileData: any[];
  selectedFile: any;
  handleUpload: () => void;
  maxInstructionDuration: number;
  setMaxInstructionDuration: (duration: number) => void;
  handleBulkUpload: (data: any[]) => void;
}

export default function AttendanceHeader({
  role,
  pastpresentStudents,
  courses,
  currentCourse,
  setCurrentCourse,
  currentClass,
  setCurrentClass,
  onSelectFile,
  fileData,
  selectedFile,
  handleUpload,
  maxInstructionDuration,
  setMaxInstructionDuration,
  handleBulkUpload,
}: AttendanceHeaderProps) {
  const deleteAttendance = api.attendances.deleteClassAttendance.useMutation({
    onSuccess: () => {
      toast.success("Attendance deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete attendance");
    },
  });

  const handleDelete = async (x: string) => {
    await deleteAttendance.mutateAsync({ classId: x });
  };

  const [clientMaxDuration, setClientMaxDuration] = useState<number>(
    isNaN(maxInstructionDuration)
      ? 40
      : Math.max(40, Math.floor(maxInstructionDuration)),
  );

  useEffect(() => {
    let maxDuration = 0;
    const calculateMaxDuration = () => {
      fileData?.forEach((student: any) => {
        if (student.Duration > maxDuration) {
          maxDuration = student.Duration;
        }
      });
      const validDuration =
        isNaN(maxDuration) || maxDuration < 40 ? 40 : Math.floor(maxDuration);
      setClientMaxDuration(validDuration);
      setMaxInstructionDuration(validDuration);
    };

    if (fileData) {
      calculateMaxDuration();
    }
  }, [fileData, setMaxInstructionDuration]);

  const handleClientUpload = async () => {
    const duration = isNaN(clientMaxDuration)
      ? 40
      : Math.max(40, Math.floor(clientMaxDuration));
    setMaxInstructionDuration(duration);
    await new Promise((resolve) => setTimeout(resolve, 100));
    handleUpload();
  };

  const handleClientMaxDuration = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (value === "") {
      setClientMaxDuration(40);
      setMaxInstructionDuration(40);
      return;
    }

    const newDuration = parseInt(value);

    if (!isNaN(newDuration)) {
      const validDuration = Math.max(40, Math.floor(newDuration));
      setClientMaxDuration(validDuration);
      setMaxInstructionDuration(validDuration);
    }
  };

  return (
    <div className="border-border bg-background/90 w-full border-b px-3 py-4 sm:px-4 sm:py-5 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="w-full sm:w-1/2 lg:w-auto">
              <Select
                value={currentCourse?.id || ""}
                onValueChange={(value) => {
                  const selected = courses?.find(
                    (course: any) => course.id === value,
                  );
                  setCurrentCourse(selected);
                }}
              >
                <SelectTrigger className="bg-background/80 border-input text-foreground w-full sm:min-w-[180px] md:min-w-[210px] lg:w-[245px]">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground border">
                  {courses?.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      <span className="text-muted-foreground">
                        No courses exist
                      </span>
                    </SelectItem>
                  ) : (
                    courses?.map((course: any) => (
                      <SelectItem key={course.id} value={course.id}>
                        <span className="text-foreground truncate">
                          {course.title}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-1/2 lg:w-auto">
              <Select
                value={currentClass?.id || ""}
                onValueChange={(value) => {
                  const selected = currentCourse?.classes.find(
                    (x: any) => x.id === value,
                  );
                  setCurrentClass(selected);
                }}
                disabled={!currentCourse}
              >
                <SelectTrigger className="bg-background/80 border-input text-foreground w-full sm:min-w-[180px] md:min-w-[210px] lg:w-[245px]">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground border">
                  {!currentCourse ? (
                    <SelectItem value="empty" disabled>
                      <span className="text-muted-foreground">
                        Select a course first
                      </span>
                    </SelectItem>
                  ) : currentCourse.classes.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      <span className="text-muted-foreground">
                        No classes available
                      </span>
                    </SelectItem>
                  ) : (
                    currentCourse.classes.map((x: any) => (
                      <SelectItem key={x.id} value={x.id}>
                        <span className="text-foreground truncate">
                          {x.title} ({dayjs(x.createdAt).format("DD-MM-YYYY")})
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {role === "INSTRUCTOR" && (
            <div className="mt-2 w-full lg:mt-0 lg:w-auto">
              {pastpresentStudents.length === 0 ? (
                <div className="flex flex-col gap-3 md:flex-row md:justify-end">
                  <div className="order-3 flex w-full flex-col gap-3 sm:flex-row md:order-1 md:w-auto">
                    {fileData && selectedFile && (
                      <>
                        <div className="w-full sm:w-[140px]">
                          <input
                            type="number"
                            min="40"
                            step="1"
                            value={
                              isNaN(clientMaxDuration) ? 40 : clientMaxDuration
                            }
                            onChange={handleClientMaxDuration}
                            onBlur={() => {
                              if (
                                isNaN(clientMaxDuration) ||
                                clientMaxDuration < 40
                              ) {
                                setClientMaxDuration(40);
                                setMaxInstructionDuration(40);
                              }
                            }}
                            placeholder="Min duration (mins)"
                            className="border-input bg-background text-foreground focus:ring-ring focus:border-input placeholder:text-muted-foreground h-10 w-full rounded-md border px-2 py-2 text-sm shadow-sm focus:ring-1 focus:outline-none"
                          />
                        </div>
                        <div className="w-full sm:w-auto">
                          <Button
                            onClick={handleClientUpload}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-10 w-full items-center justify-center gap-2"
                          >
                            Upload
                            <BiSolidCloudUpload className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="order-1 md:order-2 md:ml-auto">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="w-full sm:w-auto">
                        <div className="relative">
                          <input
                            title="Upload attendance file"
                            type="file"
                            className="border-input bg-background text-foreground hover:bg-accent/50 file:text-foreground h-10 w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50 md:w-[220px] lg:w-[245px]"
                            accept=".csv, .xlsx"
                            disabled={!currentClass}
                            onChange={(e) => {
                              const files = e.target.files;
                              if (!currentClass) {
                                toast.error("Please select a class first");
                              } else if (files && files.length > 0) {
                                const file = files[0];
                                onSelectFile(file as Blob);
                                toast.success(`File selected`);
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="order-2 w-full sm:w-auto md:order-3">
                        <div className="h-10">
                          {currentClass ? (
                            <BulkImport
                              data={[]}
                              columns={columns}
                              onImport={handleBulkUpload}
                            />
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    className="h-10 w-full cursor-not-allowed"
                                    variant="secondary"
                                    disabled
                                  >
                                    Bulk Import
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  className="bg-popover text-popover-foreground border-border border"
                                >
                                  <p className="text-destructive text-xs font-medium">
                                    Select class first
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-start md:justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="group border-destructive text-destructive hover:text-destructive-foreground relative overflow-hidden border-2 bg-transparent px-4 py-2 transition-all active:scale-[0.98]"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          Delete
                          <MdDeleteOutline className="h-4 w-4" />
                        </span>
                        <span className="bg-destructive absolute inset-0 z-0 translate-y-full transition-transform duration-200 group-hover:translate-y-0"></span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-border bg-background max-w-[95%] rounded-lg border sm:max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground text-lg font-semibold">
                          Clear Attendance
                        </AlertDialogTitle>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="border-primary text-primary rounded-full border px-2 py-0.5 text-xs">
                            {currentCourse?.title}
                          </span>
                          <span className="border-primary text-primary rounded-full border px-2 py-0.5 text-xs">
                            {currentClass?.title}
                          </span>
                        </div>
                        <div className="mt-4">
                          <p className="text-foreground font-medium">
                            Are you sure?
                          </p>
                          <p className="text-muted-foreground mt-1 text-sm">
                            Continuing will clear the attendance of all students
                            for this class. This action cannot be undone.
                          </p>
                        </div>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-3">
                        <AlertDialogCancel className="bg-secondary text-secondary-foreground hover:bg-secondary/90 w-full sm:w-auto">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(currentClass?.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
                        >
                          Delete Attendance
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
