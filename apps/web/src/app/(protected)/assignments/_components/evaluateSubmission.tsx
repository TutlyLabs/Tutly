"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import day from "@tutly/utils/dayjs";
import { api } from "@/trpc/react";

const EvaluateSubmission = ({
  submission,
  showActions,
}: {
  submission: any;
  showActions: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedScores, setEditedScores] = useState({
    responsiveness: 0,
    styling: 0,
    other: 0,
  });
  const [feedback, setFeedback] = useState<string | null>(
    submission.overallFeedback || null,
  );
  const router = useRouter();

  const rValue = submission.points.find(
    (point: any) => point.category === "RESPOSIVENESS",
  );
  const sValue = submission.points.find(
    (point: any) => point.category === "STYLING",
  );
  const oValue = submission.points.find(
    (point: any) => point.category === "OTHER",
  );

  const totalScore = [rValue, sValue, oValue].reduce((acc, currentValue) => {
    return acc + (currentValue ? currentValue.score : 0);
  }, 0);

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

  const handleFeedback = async (submissionId: string) => {
    try {
      if (!feedback) return;
      await addFeedbackMutation.mutateAsync({
        submissionId,
        feedback,
      });
    } catch (e: any) {
      toast.error("Failed to save feedback");
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    const rValue = submission?.points.find(
      (point: any) => point.category === "RESPOSIVENESS",
    );
    const sValue = submission?.points.find(
      (point: any) => point.category === "STYLING",
    );
    const oValue = submission?.points.find(
      (point: any) => point.category === "OTHER",
    );
    setEditedScores({
      responsiveness: rValue ? rValue.score : 0,
      styling: sValue ? sValue.score : 0,
      other: oValue ? oValue.score : 0,
    });
  };

  const handleSave = async () => {
    try {
      const marks = Object.entries(editedScores)
        .filter(([_, score]) => score > 0)
        .map(([category, score]) => ({
          category: category.toUpperCase(),
          score,
        }));

      await addPointsMutation.mutateAsync({
        submissionId: submission.id,
        marks,
      });

      if (feedback) {
        await handleFeedback(submission.id);
      }

      setIsEditing(false);
    } catch (e: any) {
      toast.error("Failed to save scores");
    }
  };

  const handleDelete = async () => {
    const response = confirm(
      "Are you sure you want to delete this submission?",
    );
    if (!response) return;

    try {
      await deleteSubmissionMutation.mutateAsync({
        submissionId: submission.id,
      });
    } catch (e: any) {
      toast.error("Failed to delete submission");
    }
  };

  return (
    <div className="bg-card overflow-x-auto rounded-xl border shadow-sm">
      <table className="text-foreground w-full border-collapse text-center text-sm">
        <thead className="bg-muted/30 text-muted-foreground sticky top-0 border-b">
          <tr>
            <th className="bg-muted/30 text-muted-foreground sticky left-0 z-10 px-2 py-2 text-[11px] font-semibold tracking-wide uppercase">
              Username
            </th>
            <th className="bg-muted/30 text-muted-foreground sticky left-0 px-2 py-2 text-[11px] font-semibold tracking-wide uppercase">
              Name
            </th>
            <th scope="col" className="text-muted-foreground px-2 py-2 text-[11px] font-semibold tracking-wide uppercase">
              Submission Date
            </th>
            <th scope="col" className="text-muted-foreground px-2 py-2 text-[11px] font-semibold tracking-wide uppercase">
              Responsiveness (/10)
            </th>
            <th scope="col" className="text-muted-foreground px-2 py-2 text-[11px] font-semibold tracking-wide uppercase">
              Styling (/10)
            </th>
            <th scope="col" className="text-muted-foreground px-2 py-2 text-[11px] font-semibold tracking-wide uppercase">
              Others (/10)
            </th>
            <th scope="col" className="text-muted-foreground px-2 py-2 text-[11px] font-semibold tracking-wide uppercase">
              Total
            </th>
            <th scope="col" className="text-muted-foreground px-2 py-2 text-[11px] font-semibold tracking-wide uppercase">
              Feedback
            </th>
            {showActions && (
              <th
                scope="col"
                className="text-muted-foreground px-2 py-2 text-[11px] font-semibold tracking-wide uppercase"
              >
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-border divide-y text-xs">
          {
            <tr>
              <td className="bg-card sticky left-0 px-2 py-2 font-medium">
                {submission.enrolledUser.username}
              </td>
              <td className="">{submission.enrolledUser.user.name}</td>
              <td className="px-2 py-1">
                {day(submission.submissionDate).format(
                  "DD MMM YYYY hh:mm:ss A",
                )}
              </td>
              <td className="px-2 py-1 whitespace-nowrap">
                {isEditing ? (
                  <input
                    title="null"
                    type="number"
                    value={editedScores.responsiveness}
                    onChange={(e) => {
                      const newScore = parseInt(e.target.value);
                      if (!isNaN(newScore) && newScore >= 0 && newScore <= 10) {
                        setEditedScores((prevScores) => ({
                          ...prevScores,
                          responsiveness: newScore,
                        }));
                      }
                    }}
                    min={0}
                    max={10}
                    className="text-background w-20 rounded-lg border-2 border-black bg-transparent px-2"
                  />
                ) : (
                  rValue?.score || "NA"
                )}
              </td>
              <td className="px-2 py-1 whitespace-nowrap">
                {isEditing ? (
                  <input
                    title="null"
                    type="number"
                    value={editedScores.styling}
                    onChange={(e) => {
                      const newScore = parseInt(e.target.value);
                      if (!isNaN(newScore) && newScore >= 0 && newScore <= 10) {
                        setEditedScores((prevScores) => ({
                          ...prevScores,
                          styling: newScore,
                        }));
                      }
                    }}
                    min={0}
                    max={10}
                    className="text-background w-20 rounded-lg border-2 border-black bg-transparent px-2"
                  />
                ) : (
                  sValue?.score || "NA"
                )}
              </td>
              <td className="px-2 py-1 whitespace-nowrap">
                {isEditing ? (
                  <input
                    title="null"
                    type="number"
                    value={editedScores.other}
                    onChange={(e) => {
                      const newScore = parseInt(e.target.value);
                      if (!isNaN(newScore) && newScore >= 0 && newScore <= 10) {
                        setEditedScores((prevScores) => ({
                          ...prevScores,
                          other: newScore,
                        }));
                      }
                    }}
                    min={0}
                    max={10}
                    className="text-background w-20 rounded-lg border-2 border-black bg-transparent px-2"
                  />
                ) : (
                  oValue?.score || "NA"
                )}
              </td>
              <td className="px-2 py-1 whitespace-nowrap">
                {rValue?.score || sValue?.score || oValue?.score
                  ? totalScore
                  : "NA"}
              </td>
              <td>
                {isEditing ? (
                  <textarea
                    title="null"
                    value={feedback || ""}
                    onChange={(e) => {
                      setFeedback(e.target.value);
                    }}
                    className="text-background m-2 block min-w-16 overflow-y-hidden rounded-lg border-2 border-black bg-transparent px-2 text-start"
                  ></textarea>
                ) : (
                  submission.overallFeedback || "NA"
                )}
              </td>
              {showActions && (
                <td className="px-2 py-1 whitespace-nowrap">
                  {isEditing ? (
                    <div className="flex items-center justify-center gap-5">
                      <button
                        onClick={handleSave}
                        className="font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="font-semibold text-red-600 hover:text-red-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-5">
                      <button
                        onClick={handleEdit}
                        className="font-semibold text-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="font-semibold text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          }
        </tbody>
      </table>
    </div>
  );
};

export default EvaluateSubmission;
