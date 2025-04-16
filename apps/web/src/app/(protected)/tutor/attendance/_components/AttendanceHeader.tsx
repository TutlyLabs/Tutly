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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
    isNaN(maxInstructionDuration) ? 40 : Math.max(40, Math.floor(maxInstructionDuration))
  );

  useEffect(() => {
    let maxDuration = 0;
    const calculateMaxDuration = () => {
      fileData?.forEach((student: any) => {
        if (student.Duration > maxDuration) {
          maxDuration = student.Duration;
        }
      });
      const validDuration = isNaN(maxDuration) || maxDuration < 40 ? 40 : Math.floor(maxDuration);
      setClientMaxDuration(validDuration);
      setMaxInstructionDuration(validDuration);
    };

    if (fileData) {
      calculateMaxDuration();
    }
  }, [fileData, setMaxInstructionDuration]);

  const handleClientUpload = async () => {
    const duration = isNaN(clientMaxDuration) ? 40 : Math.max(40, Math.floor(clientMaxDuration));
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
    <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 border-b border-border bg-background/90">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="w-full sm:w-1/2 lg:w-auto">
              <Select
                value={currentCourse?.id || ""}
                onValueChange={(value) => {
                  const selected = courses?.find((course: any) => course.id === value);
                  setCurrentCourse(selected);
                }}
              >
                <SelectTrigger className="w-full sm:min-w-[180px] md:min-w-[210px] lg:w-[245px] bg-background/80 border-input text-foreground">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border text-foreground">
                  {courses?.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      <span className="text-muted-foreground">No courses exist</span>
                    </SelectItem>
                  ) : (
                    courses?.map((course: any) => (
                      <SelectItem key={course.id} value={course.id}>
                        <span className="truncate text-foreground">{course.title}</span>
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
                  const selected = currentCourse?.classes.find((x: any) => x.id === value);
                  setCurrentClass(selected);
                }}
                disabled={!currentCourse}
              >
                <SelectTrigger className="w-full sm:min-w-[180px] md:min-w-[210px] lg:w-[245px] bg-background/80 border-input text-foreground">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border text-foreground">
                  {!currentCourse ? (
                    <SelectItem value="empty" disabled>
                      <span className="text-muted-foreground">Select a course first</span>
                    </SelectItem>
                  ) : currentCourse.classes.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      <span className="text-muted-foreground">No classes available</span>
                    </SelectItem>
                  ) : (
                    currentCourse.classes.map((x: any) => (
                      <SelectItem key={x.id} value={x.id}>
                        <span className="truncate text-foreground">
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
            <div className="w-full lg:w-auto mt-2 lg:mt-0">
              {pastpresentStudents.length === 0 ? (
                <div className="flex flex-col md:flex-row md:justify-end gap-3">
                  <div className="order-3 md:order-1 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {fileData && selectedFile && (
                      <>
                        <div className="w-full sm:w-[140px]">
                          <input
                            type="number"
                            min="40"
                            step="1"
                            value={isNaN(clientMaxDuration) ? 40 : clientMaxDuration}
                            onChange={handleClientMaxDuration}
                            onBlur={() => {
                              if (isNaN(clientMaxDuration) || clientMaxDuration < 40) {
                                setClientMaxDuration(40);
                                setMaxInstructionDuration(40);
                              }
                            }}
                            placeholder="Min duration (mins)"
                            className="w-full h-10 rounded-md border border-input
                                     bg-background px-2 py-2 text-sm text-foreground
                                     shadow-sm focus:outline-none focus:ring-1
                                     focus:ring-ring focus:border-input
                                     placeholder:text-muted-foreground"
                          />
                        </div>
                        <div className="w-full sm:w-auto">
                          <Button
                            onClick={handleClientUpload}
                            className="w-full h-10 flex items-center justify-center gap-2 
                                    bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            Upload
                            <BiSolidCloudUpload className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="order-1 md:order-2 md:ml-auto">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="w-full sm:w-auto">
                        <div className="relative">
                          <input
                            title="Upload attendance file"
                            type="file"
                            className="w-full md:w-[220px] lg:w-[245px] h-10 rounded-md 
                                     border border-input bg-background text-foreground 
                                     px-3 py-2 text-sm shadow-sm hover:bg-accent/50
                                     transition-colors file:border-0 file:bg-transparent 
                                     file:text-sm file:font-medium file:text-foreground
                                     disabled:cursor-not-allowed disabled:opacity-50"
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

                      <div className="w-full sm:w-auto order-2 md:order-3">
                        <div className="h-10">
                          {currentClass ? (
                            <BulkImport data={[]} columns={columns} onImport={handleBulkUpload} />
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    className="w-full h-10 cursor-not-allowed"
                                    variant="secondary"
                                    disabled
                                  >
                                    Bulk Import
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="bg-popover text-popover-foreground border border-border">
                                  <p className="text-xs font-medium text-destructive">
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
                        className="group relative overflow-hidden border-2 border-destructive
                                bg-transparent px-4 py-2 text-destructive transition-all
                                hover:text-destructive-foreground active:scale-[0.98]"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          Delete
                          <MdDeleteOutline className="h-4 w-4" />
                        </span>
                        <span className="absolute inset-0 z-0 translate-y-full bg-destructive 
                                       transition-transform duration-200 group-hover:translate-y-0"></span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[95%] sm:max-w-md rounded-lg border border-border bg-background">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground text-lg font-semibold">
                          Clear Attendance
                        </AlertDialogTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="rounded-full border border-primary px-2 py-0.5 text-xs text-primary">
                            {currentCourse?.title}
                          </span>
                          <span className="rounded-full border border-primary px-2 py-0.5 text-xs text-primary">
                            {currentClass?.title}
                          </span>
                        </div>
                        <div className="mt-4">
                          <p className="text-foreground font-medium">Are you sure?</p>
                          <p className="text-muted-foreground text-sm mt-1">
                            Continuing will clear the attendance of all students for this class.
                            This action cannot be undone.
                          </p>
                        </div>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
                        <AlertDialogCancel className="w-full sm:w-auto bg-secondary text-secondary-foreground hover:bg-secondary/90">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(currentClass?.id)}
                          className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
