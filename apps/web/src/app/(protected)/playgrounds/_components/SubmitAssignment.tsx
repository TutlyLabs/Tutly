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
  const { data: res, isPending } = api.assignments.submitAssignment.useMutation(
    {
      onSuccess: (data) => {
        if (!data.assignment || !currentUser) {
          toast.error("Error fetching assignment details");
        }
      },
      onError: () => {
        toast.error("Error fetching assignment details");
      },
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
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
};

export default SubmitAssignment;
