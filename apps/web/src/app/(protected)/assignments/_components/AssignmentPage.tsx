"use client";

import day from "dayjs";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FaSearch } from "react-icons/fa";
import { FaEye } from "react-icons/fa";
import { FiEdit } from "react-icons/fi";
import { MdOutlineDelete } from "react-icons/md";
import { RiWhatsappLine } from "react-icons/ri";
import {
  FiCopy,
  FiRefreshCw,
  FiGitBranch,
  FiFolder,
  FiExternalLink,
} from "react-icons/fi";
import Link from "next/link";

import ContentPreview from "@/components/ContentPreview";
import { Pagination } from "@/components/table/Pagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";
import NewAttachmentPage from "@/app/(protected)/courses/[id]/classes/_components/NewAssignments";
import { api } from "@/trpc/react";

interface GitFsConfig {
  assignmentId?: string;
  submissionId?: string;
  type?: "TEMPLATE" | "SUBMISSION";
  branch?: string;
}

// todo: switch to vscode settings instead of prompting for assignmentId
// function buildGitFsWorkspace(config: GitFsConfig) {
//   const settings = {
//     "tutlyfs.assignmentId": config.assignmentId || "",
//     "tutlyfs.submissionId": config.submissionId || "",
//     "tutlyfs.type": config.type || "SUBMISSION",
//   };

//   return {
//     folders: [
//       {
//         uri: "tutlyfs:/",
//         name: `Git: ${config.type === "TEMPLATE" ? "Template" : "Submission"}`,
//       },
//     ],
//     settings,
//   };
// }

interface Props {
  currentUser: any;
  assignment: any;
  assignments: any;
  notSubmittedMentees: any;
  isCourseAdmin: boolean;
  username: string;
  mentors: string[];
  pagination: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
  };
  isSandboxSubmissionEnabled: boolean;
}

export default function AssignmentPage({
  currentUser,
  assignment,
  assignments,
  notSubmittedMentees,
  isCourseAdmin = false,
  username,
  mentors,
  pagination,
  isSandboxSubmissionEnabled,
}: Props) {
  const haveAdminAccess =
    currentUser && (currentUser.role === "INSTRUCTOR" || isCourseAdmin);
  const isSandboxConfigured =
    isSandboxSubmissionEnabled && assignment.sandboxTemplate !== null;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [nonSubmissions, setNonSubmissions] = useState<boolean>(false);
  const [modal, setModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editedScores, setEditedScores] = useState({
    responsiveness: 0,
    styling: 0,
    other: 0,
  });
  const [feedback, setFeedback] = useState("");
  const [isEditClassDialogOpen, setIsEditClassDialogOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const addPointsMutation = api.points.addPoints.useMutation({
    onSuccess: () => {
      toast.success("Scores saved successfully");
      router.refresh();
    },
    onError: () => {
      toast.error("Failed to save scores");
    },
  });

  const addFeedbackMutation = api.submissions.addOverallFeedback.useMutation({
    onSuccess: () => {
      toast.success("Feedback saved successfully");
      router.refresh();
    },
    onError: () => {
      toast.error("Failed to save feedback");
    },
  });

  const deleteSubmissionMutation = api.submissions.deleteSubmission.useMutation(
    {
      onSuccess: () => {
        toast.success("Submission deleted successfully");
        router.refresh();
      },
      onError: () => {
        toast.error("Failed to delete submission");
      },
    },
  );

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  const handlePageSizeChange = (size: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", size.toString());
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleWhatsAppClick = (phone: string) => {
    setPhoneNumber(phone);
    setModal(true);
  };

  const handleSend = (message: string) => {
    window.open(
      `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${message}&app_absent=0`,
      "_blank",
    );
    setModal(false);
  };

  const handleFeedback = async (submissionId: string) => {
    if (!feedback) return;
    await addFeedbackMutation.mutateAsync({
      submissionId,
      feedback,
    });
  };

  const handleEdit = (index: number, submissionId: string) => {
    setEditingIndex(index);
    const submission = assignments.find((x: any) => x.id === submissionId);

    const getScore = (category: string) => {
      return (
        submission?.points.find((point: any) => point.category === category)
          ?.score || 0
      );
    };

    setEditedScores({
      responsiveness: getScore("RESPOSIVENESS"),
      styling: getScore("STYLING"),
      other: getScore("OTHER"),
    });
  };

  const handleSave = async (index: number) => {
    const marks = Object.entries(editedScores)
      .filter(([_, score]) => score > 0)
      .map(([category, score]) => ({
        category: category.toUpperCase(),
        score,
      }));

    await addPointsMutation.mutateAsync({
      submissionId: assignments[index].id,
      marks,
    });

    if (feedback) {
      await handleFeedback(assignments[index].id);
    }

    setEditingIndex(-1);
    setFeedback("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;
    await deleteSubmissionMutation.mutateAsync({ submissionId: id });
  };

  const handleMentorChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("mentor");
    } else {
      params.set("mentor", value);
    }
    router.push(`?${params.toString()}`);
  };

  const selectedMentor = searchParams.get("mentor") || "all";

  return (
    <div className="relative mx-2 my-2 md:mx-10">
      <h1 className="rounded bg-gradient-to-l from-blue-500 to-blue-600 p-2 text-center text-sm font-medium text-white md:text-lg">
        Assignment Submission : {assignment?.title}
      </h1>

      <div className="my-4 flex items-center justify-between text-xs font-medium md:text-sm">
        <div className="flex items-center gap-2">
          <p className="bg-secondary-500 rounded p-1 px-2 text-white">
            # {assignment?.class?.course?.title}
          </p>
          {assignment?.class?.course && (
            <Link
              href={`/courses/${assignment.class.course.id}/classes/${assignment.class.id}`}
              className="rounded bg-blue-500 p-1 px-2 text-white transition hover:bg-blue-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              {assignment.class.title}
            </Link>
          )}
        </div>
        <div className="flex items-center justify-center gap-4">
          {assignment?.dueDate != null && (
            <div
              className={`rounded p-1 px-2 text-white ${
                new Date(assignment?.dueDate) > new Date()
                  ? "bg-primary-600"
                  : "bg-secondary-500"
              }`}
            >
              Last Date : {assignment?.dueDate.toISOString().split("T")[0]}
            </div>
          )}
        </div>
      </div>
      <div className="flex w-full items-center justify-between">
        <span className="mt-5 block">Details : 👇</span>
        <div className="flex items-center justify-center gap-4">
          <h1 className="rounded-md border p-1 text-sm">
            Max responses : {assignment?.maxSubmissions}
          </h1>
          {haveAdminAccess && assignment.submissionMode === "SANDBOX" && (
            <Button
              asChild
              className="rounded-md bg-blue-600 p-1 px-3 hover:bg-blue-700"
            >
              <Link
                href={`/playgrounds/sandbox?assignmentId=${assignment.id}&editTemplate=true`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {isSandboxConfigured ? "Update Sandbox" : "Configure Sandbox"}
              </Link>
            </Button>
          )}
          {haveAdminAccess && (
            <Dialog
              open={isEditClassDialogOpen}
              onOpenChange={setIsEditClassDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="rounded-md bg-emerald-700 p-1 px-3 hover:bg-emerald-800">
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] min-w-[70vw] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit</DialogTitle>
                  <DialogDescription>
                    Modify the assignment details.
                  </DialogDescription>
                </DialogHeader>
                {assignment && (
                  <NewAttachmentPage
                    classes={assignment.course.classes}
                    courseId={assignment.courseId}
                    classId={assignment.classId}
                    isEditing={true}
                    attachment={assignment}
                    onCancel={() => setIsEditClassDialogOpen(false)}
                    onComplete={() => {
                      setIsEditClassDialogOpen(false);
                      router.refresh();
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <div className="my-5">
        <ContentPreview
          className="text-xs"
          content={assignment?.details || "No details given to show"}
          jsonContent={assignment?.detailsJson}
        />
      </div>

      <div className="my-4 flex flex-col gap-4 text-black">
        <div>
          <Link
            target="_blank"
            href={`${assignment?.link}`}
            className="text-sm font-semibold break-words text-blue-400"
          >
            {assignment?.link}
          </Link>
        </div>

        {haveAdminAccess && assignment.submissionMode === "GIT" && (
          <GitTemplateSection assignment={assignment} />
        )}

        {currentUser?.role === "STUDENT" ? (
          <StudentAssignmentSubmission
            courseId={assignment.courseId}
            assignment={assignment}
            isSandboxConfigured={isSandboxConfigured}
            setIsVideoModalOpen={setIsVideoModalOpen}
          />
        ) : (
          <AdminAssignmentTable
            assignmentId={assignment.id}
            assignments={assignments}
            notSubmittedMentees={notSubmittedMentees}
            currentUser={currentUser}
            username={username}
            assignment={assignment}
            mentors={mentors}
            searchQuery={searchQuery}
            onSearch={handleSearch}
            editingIndex={editingIndex}
            editedScores={editedScores}
            setEditedScores={setEditedScores}
            feedback={feedback}
            setFeedback={setFeedback}
            onEdit={handleEdit}
            onSave={handleSave}
            onDelete={handleDelete}
            onWhatsAppClick={handleWhatsAppClick}
            onMentorChange={handleMentorChange}
            selectedMentor={selectedMentor}
            nonSubmissions={nonSubmissions}
            setNonSubmissions={setNonSubmissions}
            modal={modal}
            setModal={setModal}
            onSend={handleSend}
            isSandboxConfigured={isSandboxConfigured}
          />
        )}
      </div>

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        pageSize={pagination.pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Video Demo Modal */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Assignment Submission Demo</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/KImR86tLwx4"
              title="Assignment Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const StudentAssignmentSubmission = ({
  assignment,
  courseId,
  isSandboxConfigured,
  setIsVideoModalOpen,
}: {
  assignment: any;
  courseId: string;
  isSandboxConfigured: boolean;
  setIsVideoModalOpen: (open: boolean) => void;
}) => {
  const [externalLink, setExternalLink] = useState("");
  const router = useRouter();
  const submitExternalLinkMutation =
    api.submissions.submitExternalLink.useMutation({
      onSuccess: () => {
        toast.success("Assignment submitted successfully");
        router.refresh();
      },
      onError: (error) => {
        toast.error(`Error: ${error.message}`);
      },
    });

  const validateCodeSandboxLink = async (url: string): Promise<boolean> => {
    try {
      const sandboxIdMatch = url.match(
        /codesandbox\.io\/(?:p\/(?:sandbox|devbox)\/|s\/)([a-zA-Z0-9-_]+)/,
      );
      if (!sandboxIdMatch) {
        toast.error("Invalid CodeSandbox URL format");
        return false;
      }

      const sandboxId = sandboxIdMatch[1];

      // Check if sandbox is accessible (not private)
      const response = await fetch(
        `https://codesandbox.io/api/v1/sandboxes/${sandboxId}`,
      );

      if (response.status === 404) {
        toast.error(
          "CodeSandbox not found or is private. Please make it public or unlisted.",
        );
        return false;
      }

      if (!response.ok) {
        toast.error("Unable to verify CodeSandbox accessibility");
        return false;
      }

      const data = await response.json();

      // Check if sandbox is private
      if (data.privacy === 1) {
        // 1 = private, 0 = public, 2 = unlisted
        toast.error(
          "CodeSandbox is private. Please make it public or unlisted before submitting.",
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error validating CodeSandbox link:", error);
      toast.error("Error validating CodeSandbox link");
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (assignment.maxSubmissions <= assignment.submissions.length) {
      toast.error("Maximum submissions reached");
      return;
    }

    if (externalLink.includes("codesandbox.io")) {
      const isValid = await validateCodeSandboxLink(externalLink);
      if (!isValid) {
        return;
      }
    }

    try {
      await submitExternalLinkMutation.mutateAsync({
        assignmentId: assignment.id,
        externalLink,
        maxSubmissions: assignment.maxSubmissions,
        courseId,
      });
      setExternalLink("");
    } catch (error) {
      toast.error("Error submitting assignment");
    }
  };

  const isMaxSubmissionsReached =
    assignment?.maxSubmissions <= assignment.submissions.length;
  const isPlaygroundSubmission = assignment.submissionMode === "HTML_CSS_JS";

  const isExternalLinkSubmission =
    assignment.submissionMode === "EXTERNAL_LINK";

  const isGitSubmission = assignment.submissionMode === "GIT";

  return (
    <div className="space-y-6">
      <div>
        {isMaxSubmissionsReached ? (
          <div className="my-5 text-center text-lg font-semibold text-white">
            No more responses are accepted!
          </div>
        ) : isPlaygroundSubmission ? (
          <Button asChild>
            <Link
              href={`/playgrounds/html-css-js?assignmentId=${assignment.id}`}
              target="_blank"
            >
              {assignment?.submissions.length === 0
                ? "Submit through Playground"
                : "Submit another response"}
            </Link>
          </Button>
        ) : isGitSubmission ? (
          <GitSubmissionSection assignment={assignment} />
        ) : isExternalLinkSubmission ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                {assignment?.submissions.length === 0
                  ? "Submit External Link"
                  : "Submit another response"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add External Link</DialogTitle>
                <DialogDescription>
                  Submit your assignment using a CodeSandbox link.{" "}
                  <Button
                    variant="link"
                    className="ml-2 h-auto p-0 font-light text-blue-400 hover:text-blue-500"
                    onClick={() => setIsVideoModalOpen(true)}
                  >
                    View Demo
                  </Button>
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-6 items-center gap-4">
                  <Label htmlFor="externalLink" className="text-right">
                    Link
                  </Label>
                  <Input
                    id="externalLink"
                    value={externalLink}
                    onChange={(e) => setExternalLink(e.target.value)}
                    placeholder="https://codesandbox.io/p/sandbox/..."
                    className="col-span-5"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={
                      submitExternalLinkMutation.isPending ||
                      !externalLink.trim()
                    }
                    className="min-w-[120px]"
                  >
                    {submitExternalLinkMutation.isPending ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Assignment"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : isSandboxConfigured ? (
          <Button asChild>
            <Link
              href={`/playgrounds/sandbox?assignmentId=${assignment.id}`}
              target="_blank"
            >
              {assignment?.submissions.length === 0
                ? "Submit through Playground"
                : "Submit another response"}
            </Link>
          </Button>
        ) : (
          <div className="text-center text-gray-500">
            No submission method available
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-foreground text-lg font-semibold">Submissions</h2>

        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="text-foreground">No.</TableHead>
              <TableHead className="text-foreground">View Submission</TableHead>
              <TableHead className="text-foreground">Submission Date</TableHead>
              <TableHead className="text-foreground">Feedback</TableHead>
              <TableHead className="text-foreground">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignment?.submissions.map((submission: any, index: number) => {
              const points = {
                responsiveness:
                  submission.points.find(
                    (p: any) => p.category === "RESPOSIVENESS",
                  )?.score || 0,
                styling:
                  submission.points.find((p: any) => p.category === "STYLING")
                    ?.score || 0,
                other:
                  submission.points.find((p: any) => p.category === "OTHER")
                    ?.score || 0,
              };

              const totalScore = Object.values(points).reduce(
                (sum, score) => sum + score,
                0,
              );
              const submissionUrl = isPlaygroundSubmission
                ? `/playgrounds/html-css-js?submissionId=${submission.id}`
                : isExternalLinkSubmission
                  ? submission.submissionLink
                  : isSandboxConfigured
                    ? `/playgrounds/sandbox?submissionId=${submission.id}`
                    : submission.submissionLink;

              return (
                <TableRow key={index}>
                  <TableCell className="text-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <Button variant="link" asChild>
                      <Link href={submissionUrl} target="_blank">
                        View
                      </Link>
                    </Button>
                  </TableCell>
                  <TableCell className="text-foreground">
                    {submission.submissionDate.toISOString().split("T")[0] ||
                      "NA"}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {submission.overallFeedback || "NA"}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {totalScore ? "Submitted" : "NA"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

type Scores = {
  responsiveness: number;
  styling: number;
  other: number;
};

type AdminTableProps = {
  assignmentId: string;
  assignments: any[];
  notSubmittedMentees: any[];
  currentUser: any;
  username: string;
  assignment: any;
  mentors: string[];
  searchQuery: string;
  onSearch: (value: string) => void;
  editingIndex: number;
  editedScores: Scores;
  setEditedScores: (scores: Scores) => void;
  feedback: string;
  setFeedback: (feedback: string) => void;
  onEdit: (index: number, submissionId: string) => void;
  onSave: (index: number) => void;
  onDelete: (id: string) => void;
  onWhatsAppClick: (phone: string) => void;
  onMentorChange: (value: string) => void;
  selectedMentor: string;
  nonSubmissions: boolean;
  setNonSubmissions: (value: boolean) => void;
  modal: boolean;
  setModal: (value: boolean) => void;
  onSend: (message: string) => void;
  isSandboxConfigured: boolean;
};

const AdminAssignmentTable = ({
  assignmentId,
  assignments,
  notSubmittedMentees,
  currentUser,
  username,
  assignment,
  mentors,
  searchQuery,
  onSearch,
  editingIndex,
  editedScores,
  setEditedScores,
  feedback,
  setFeedback,
  onEdit,
  onSave,
  onDelete,
  onWhatsAppClick,
  onMentorChange,
  selectedMentor,
  nonSubmissions,
  setNonSubmissions,
  modal,
  setModal,
  onSend,
  isSandboxConfigured,
}: AdminTableProps) => {
  const router = useRouter();
  const messages = [
    "Hi, how are you?",
    "Complete your assignments on time !!",
    "Make sure to review the recorded lectures for better understanding",
    "Good Work in web development,Keep Going",
    "Don't forget to participate actively in class discussions!",
    "Ask questions if you need clarification; we're here to help!",
    "Maintain proper attendance,your attendance was poor",
  ];

  return (
    <div>
      <div className="mt-8 mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6 max-sm:flex-col">
          <div className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white">
            Submissions : 👇
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMentor} onValueChange={onMentorChange}>
              <SelectTrigger className="w-[180px] text-white max-sm:w-[150px]">
                <SelectValue placeholder="Filter by mentor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Mentors</SelectItem>
                {mentors.map((mentor) => (
                  <SelectItem key={mentor} value={mentor}>
                    {mentor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setNonSubmissions(!nonSubmissions)}
              variant="link"
              className="text-muted-foreground hover:text-foreground italic"
            >
              {!nonSubmissions ? "Not received from?" : "Received from?"}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Input
              className="pl-8"
              placeholder="Search username"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
            />
            <FaSearch className="text-muted-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2" />
          </div>
          <Button
            onClick={() => {
              if (username) {
                router.push(
                  `/assignments/${assignmentId}/evaluate?username=${username}`,
                );
              } else {
                router.push(`/assignments/${assignmentId}/evaluate`);
              }
            }}
            variant={"link"}
            className="border border-white text-white hover:bg-white hover:text-black"
          >
            Evaluate
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {nonSubmissions ? (
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="text-foreground">Sl.no</TableHead>
                <TableHead className="text-foreground">Username</TableHead>
                <TableHead className="text-foreground">Mentor</TableHead>
                <TableHead className="text-foreground">Notify</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notSubmittedMentees?.map((user: any, index: any) => (
                <TableRow key={index}>
                  <TableCell className="text-foreground">{index + 1}</TableCell>
                  <TableCell className="text-foreground">
                    {user.username}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {user.mentorUsername}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onWhatsAppClick("9160804126")}
                    >
                      <RiWhatsappLine className="h-5 w-5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="text-foreground">Sl.no</TableHead>
                <TableHead className="text-foreground">Username</TableHead>
                <TableHead className="text-foreground">Date</TableHead>
                <TableHead className="text-foreground">
                  Responsive(10)
                </TableHead>
                <TableHead className="text-foreground">Styling(10)</TableHead>
                <TableHead className="text-foreground">Others(10)</TableHead>
                <TableHead className="text-foreground">Total</TableHead>
                <TableHead className="text-foreground">Feedback</TableHead>
                {currentUser.role !== "STUDENT" && (
                  <>
                    <TableHead className="text-foreground">Actions</TableHead>
                    <TableHead className="text-foreground">Evaluate</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments?.map((submission: any, index: any) => {
                const rValue = submission.points.find(
                  (point: any) => point.category === "RESPOSIVENESS",
                );
                const sValue = submission.points.find(
                  (point: any) => point.category === "STYLING",
                );
                const oValue = submission.points.find(
                  (point: any) => point.category === "OTHER",
                );

                const totalScore = [rValue, sValue, oValue].reduce(
                  (acc, currentValue) => {
                    return acc + (currentValue ? currentValue.score : 0);
                  },
                  0,
                );

                return (
                  <TableRow key={index}>
                    <TableCell className="text-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-foreground">
                      <div>{submission.enrolledUser.username}</div>
                      <div className="text-muted-foreground text-xs">
                        {submission.enrolledUser.mentorUsername}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {day(submission.submissionDate).format(
                        "DD MMM YYYY, hh:mm:ss A",
                      )}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {editingIndex === index ? (
                        <Input
                          type="number"
                          value={editedScores.responsiveness}
                          onChange={(e) => {
                            const newScore = parseInt(e.target.value);
                            if (
                              !isNaN(newScore) &&
                              newScore >= 0 &&
                              newScore <= 10
                            ) {
                              setEditedScores({
                                ...editedScores,
                                responsiveness: newScore,
                              });
                            }
                          }}
                          min={0}
                          max={10}
                          className="w-20"
                        />
                      ) : (
                        rValue?.score || "NA"
                      )}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {editingIndex === index ? (
                        <Input
                          type="number"
                          value={editedScores.styling}
                          onChange={(e) => {
                            const newScore = parseInt(e.target.value);
                            if (
                              !isNaN(newScore) &&
                              newScore >= 0 &&
                              newScore <= 10
                            ) {
                              setEditedScores({
                                ...editedScores,
                                styling: newScore,
                              });
                            }
                          }}
                          min={0}
                          max={10}
                          className="w-20"
                        />
                      ) : (
                        sValue?.score || "NA"
                      )}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {editingIndex === index ? (
                        <Input
                          type="number"
                          value={editedScores.other}
                          onChange={(e) => {
                            const newScore = parseInt(e.target.value);
                            if (
                              !isNaN(newScore) &&
                              newScore >= 0 &&
                              newScore <= 10
                            ) {
                              setEditedScores({
                                ...editedScores,
                                other: newScore,
                              });
                            }
                          }}
                          min={0}
                          max={10}
                          className="w-20"
                        />
                      ) : (
                        oValue?.score || "NA"
                      )}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {rValue?.score || sValue?.score || oValue?.score
                        ? totalScore
                        : "NA"}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {editingIndex === index ? (
                        <textarea
                          value={feedback}
                          defaultValue={submission.overallFeedback}
                          onChange={(e) => {
                            setFeedback(e.target.value);
                          }}
                          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                        />
                      ) : (
                        submission.overallFeedback || "NA"
                      )}
                    </TableCell>
                    {currentUser.role !== "STUDENT" && (
                      <>
                        <TableCell>
                          {editingIndex === index ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  void onSave(index);
                                }}
                              >
                                Save
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => onEdit(-1, "")}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" asChild>
                                <Link
                                  href={
                                    assignment.submissionMode ===
                                      "HTML_CSS_JS" || isSandboxConfigured
                                      ? `/playgrounds/sandbox?submissionId=${submission.id}`
                                      : submission.submissionLink
                                  }
                                  target="_blank"
                                >
                                  <FaEye className="h-4 w-4 text-white" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  onEdit(index, submission.id);
                                }}
                              >
                                <FiEdit className="h-4 w-4 text-white" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(submission.id)}
                              >
                                <MdOutlineDelete className="h-4 w-4 text-white" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="link" asChild>
                            <Link
                              href={`/assignments/${assignmentId}/evaluate?submissionId=${submission.id}`}
                            >
                              Evaluate
                            </Link>
                          </Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {modal && (
          <Dialog open={modal} onOpenChange={setModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select a message to send</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className="border-border flex items-center justify-between gap-4 border-b py-2"
                  >
                    <p className="text-foreground text-sm">{msg}</p>
                    <Button variant="link" onClick={() => onSend(msg)}>
                      Send
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

const maskGitUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    if (urlObj.password) {
      // Mask the password (token) with asterisks
      const maskedUrl = url.replace(
        `:${urlObj.password}@`,
        `:${"*".repeat(8)}@`,
      );
      return maskedUrl;
    }
    return url;
  } catch {
    return url;
  }
};

// Git Template Section for Instructors
const GitTemplateSection = ({ assignment }: { assignment: any }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [repoData, setRepoData] = useState<{
    repoUrl: string;
    expiresAt?: Date;
  } | null>(null);

  // Load existing repo data on mount
  useEffect(() => {
    const loadExistingRepo = async () => {
      try {
        const response = await fetch(
          `/api/git/create?assignmentId=${assignment.id}&type=TEMPLATE`,
        );
        const data = await response.json();
        if (data.exists && data.repoUrl) {
          setRepoData({
            repoUrl: data.repoUrl,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
          });
        }
      } catch (error) {
        console.error("Error loading existing repo:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadExistingRepo();
  }, [assignment.id]);

  const createTemplateRepo = async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/git/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TEMPLATE",
          assignmentId: assignment.id,
        }),
      });

      const data = await response.json();
      if (data.success || data.repoUrl) {
        setRepoData({
          repoUrl: data.repoUrl,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        });
        toast.success("Template repository URL refreshed!");
      } else {
        toast.error(data.error || "Failed to create template repository");
      }
    } catch (error) {
      toast.error("Error creating template repository");
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FiGitBranch className="h-4 w-4 text-green-400" />
            Git Template Repository
            <Badge className="bg-green-600 text-xs">Instructor</Badge>
          </CardTitle>
          {repoData && (
            <Button
              onClick={createTemplateRepo}
              variant="ghost"
              size="sm"
              className="h-8"
            >
              <FiRefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-700/50" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-700/50" />
          </div>
        ) : !repoData ? (
          <Button
            onClick={createTemplateRepo}
            disabled={isCreating}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isCreating ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating Template...
              </>
            ) : (
              <>
                <FiGitBranch className="mr-2 h-4 w-4" />
                Create Template Repository
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-medium text-gray-400">
                Clone & Work Locally
              </div>
              <div className="rounded-lg bg-slate-900/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <code className="flex-1 overflow-x-auto text-xs text-green-400">
                    git clone {maskGitUrl(repoData.repoUrl)}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard(`git clone ${repoData.repoUrl}`)
                    }
                    className="h-7 px-2"
                  >
                    <FiCopy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {repoData.expiresAt && (
                <div className="mt-2 text-xs text-amber-400">
                  ⚠️ Expires: {new Date(repoData.expiresAt).toLocaleString()}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 text-xs font-medium text-gray-400">
                View in VSCode
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const params = new URLSearchParams({
                      assignmentId: assignment.id,
                    });
                    const url = `/vscode/?${params.toString()}`;
                    window.open(url, "_blank");
                  }}
                  className="w-full"
                >
                  <FiExternalLink className="mr-2 h-3 w-3" />
                  Open in VSCode
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Git Submission Section for Students
const GitSubmissionSection = ({ assignment }: { assignment: any }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [repoData, setRepoData] = useState<{
    repoUrl: string;
    expiresAt?: Date;
    lastUpdated?: Date;
    id?: string;
  } | null>(null);

  // Load existing repo data on mount
  useEffect(() => {
    const loadExistingRepo = async () => {
      try {
        const response = await fetch(
          `/api/git/create?assignmentId=${assignment.id}&type=SUBMISSION`,
        );
        const data = await response.json();
        if (data.exists && data.repoUrl) {
          setRepoData({
            repoUrl: data.repoUrl,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
            lastUpdated: data.lastUpdated
              ? new Date(data.lastUpdated)
              : undefined,
            id: data.submissionId,
          });
        }
      } catch (error) {
        console.error("Error loading existing repo:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadExistingRepo();
  }, [assignment.id]);

  const createSubmissionRepo = async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/git/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SUBMISSION",
          assignmentId: assignment.id,
        }),
      });

      const data = await response.json();
      if (data.success || data.repoUrl) {
        setRepoData({
          repoUrl: data.repoUrl,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
          lastUpdated: new Date(),
          id: data.submissionId,
        });
        toast.success(
          repoData
            ? "Repository URL refreshed!"
            : "Submission repository created successfully!",
        );
      } else {
        toast.error(data.error || "Failed to create submission repository");
      }
    } catch (error) {
      toast.error("Error creating submission repository");
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const refreshRepo = async () => {
    await createSubmissionRepo();
  };

  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FiGitBranch className="h-4 w-4 text-blue-400" />
            Git Submission Repository
            <Badge className="bg-blue-600 text-xs">Student</Badge>
          </CardTitle>
          {repoData && (
            <Button
              size="sm"
              variant="ghost"
              onClick={refreshRepo}
              disabled={isCreating}
              className="h-8"
            >
              <FiRefreshCw
                className={`h-4 w-4 ${isCreating ? "animate-spin" : ""}`}
              />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-700/50" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-700/50" />
          </div>
        ) : !repoData ? (
          <Button
            onClick={createSubmissionRepo}
            disabled={isCreating}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {isCreating ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating Repository...
              </>
            ) : (
              <>
                <FiGitBranch className="mr-2 h-4 w-4" />
                Create Submission Repository
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-medium text-gray-400">
                Clone & Work Locally
              </div>
              <div className="rounded-lg bg-slate-900/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <code className="flex-1 overflow-x-auto text-xs text-green-400">
                    git clone {maskGitUrl(repoData.repoUrl)}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard(`git clone ${repoData.repoUrl}`)
                    }
                    className="h-7 px-2"
                  >
                    <FiCopy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {repoData.expiresAt && (
                <div className="mt-2 text-xs text-amber-400">
                  ⚠️ Expires: {new Date(repoData.expiresAt).toLocaleString()}
                </div>
              )}
            </div>

            {/* Step 2: View Submission */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600">Step 2</Badge>
                <span className="text-sm font-medium">
                  View your latest submission from local
                </span>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    {repoData.lastUpdated && (
                      <>
                        Last Updated:{" "}
                        {new Date(repoData.lastUpdated).toLocaleString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          },
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const params = new URLSearchParams({
                          assignmentId: assignment.id,
                        });
                        const url = `/vscode/?${params.toString()}`;
                        window.open(url, "_blank");
                      }}
                      className="h-auto py-1 text-xs"
                    >
                      <FiExternalLink className="mr-1 h-3 w-3" />
                      Open in VSCode
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={refreshRepo}
                      disabled={isCreating}
                      className="h-auto py-1 text-xs"
                    >
                      <FiRefreshCw
                        className={`mr-1 h-3 w-3 ${isCreating ? "animate-spin" : ""}`}
                      />
                      Refresh View
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-blue-500/30 bg-blue-950/20 p-3 text-xs text-blue-300">
              💡 <strong>Tip:</strong> After making changes locally, commit and
              push to see them reflected in your submission.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
