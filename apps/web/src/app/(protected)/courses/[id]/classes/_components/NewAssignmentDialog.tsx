"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/trpc/react";
import NewAttachmentPage from "./NewAssignments";

interface NewAssignmentDialogProps {
  courseId: string;
}

const NewAssignmentDialog = ({ courseId }: NewAssignmentDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: classes } = api.classes.getClassesByCourseId.useQuery({
    courseId,
  });

  // Handle URL parameter for modal
  useEffect(() => {
    const modal = searchParams.get("modal");
    if (modal === "newAssignment") {
      setIsOpen(true);
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("modal");
      const cleanUrl = newSearchParams.toString()
        ? `${window.location.pathname}?${newSearchParams.toString()}`
        : window.location.pathname;
      router.replace(cleanUrl, { scroll: false });
    }
  }, [searchParams, router]);

  const handleComplete = () => {
    setIsOpen(false);
    router.refresh();
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="!max-h-[90vh] !max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Assignment</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {classes?.data && classes.data.length > 0 ? (
            <NewAttachmentPage
              classes={classes.data}
              courseId={courseId}
              classId={classes.data[0]?.id || ""}
              onComplete={handleComplete}
              onCancel={handleCancel}
            />
          ) : (
            <div className="py-6 text-center">
              <p className="text-muted-foreground">
                No classes found. Please create a class first before creating
                assignments.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewAssignmentDialog;
