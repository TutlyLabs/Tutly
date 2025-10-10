"use client";

import { toast } from "sonner";
import { api } from "@/trpc/react";
import Submit from "./Submit";
import { Skeleton } from "@/components/ui/skeleton";

const SubmitAssignment = ({
  currentUser,
  assignmentId,
}: {
  currentUser: any;
  assignmentId: string;
}) => {
  const { data: res, isPending } =
    api.assignments.getAssignmentDetailsForSubmission.useQuery(
      { id: assignmentId },
      {
        enabled: !!assignmentId,
      },
    );

  if (!assignmentId) return null;

  if (currentUser?.role !== "STUDENT") return null;

  return res ? (
    <Submit
      user={currentUser}
      mentorDetails={res.mentorDetails}
      assignmentDetails={res.assignment}
      isLoading={isPending}
    />
  ) : (
    <Skeleton className="h-8 w-48" />
  );
};

export default SubmitAssignment;
