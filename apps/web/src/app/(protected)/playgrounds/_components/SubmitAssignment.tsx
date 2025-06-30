"use client";

import { toast } from "sonner";
import { api } from "@/trpc/react";
import Submit from "./Submit";

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

  return res ? (
    <Submit
      user={currentUser}
      mentorDetails={res.mentorDetails}
      assignmentDetails={res.assignment}
      isLoading={isPending}
    />
  ) : (
    <h1 className="text-2xl font-bold">Loading...</h1>
  );
};

export default SubmitAssignment;
