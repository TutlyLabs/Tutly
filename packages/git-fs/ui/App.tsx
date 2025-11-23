import React, { useEffect, useState } from "react";
import { MarkdownPreview } from "./components/MarkdownPreview";

interface Assignment {
  id: string;
  title: string;
  details: string;
}

export function App() {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);

  useEffect(() => {
    const id = (window as any).ASSIGNMENT_ID;
    const authToken = (window as any).AUTH_TOKEN;
    const vscode = (window as any).vscode;

    if (!id) {
      setError("No assignment ID provided");
      setLoading(false);
      return;
    }

    if (!vscode) {
      setError("VSCode API not available");
      setLoading(false);
      return;
    }

    setAssignmentId(id);

    window.addEventListener('message', (event) => {
      const message = event.data;

      switch (message.type) {
        case 'assignmentData':
          const assignmentData = message.data?.assignment;
          if (assignmentData) {
            setAssignment({
              id: assignmentData.id,
              title: assignmentData.title,
              details: assignmentData.details,
            });
          } else {
            setError("Assignment not found");
          }
          setLoading(false);
          break;

        case 'assignmentError':
          setError(message.error || "Failed to fetch assignment");
          setLoading(false);
          break;
      }
    });

    vscode.postMessage({
      type: 'fetchAssignment',
      assignmentId: id,
      authToken: authToken
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-400">Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1e1e1e]">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Assignment</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <p className="text-gray-400">No assignment data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">{assignment.title}</h1>
          <div className="h-1 w-20 bg-blue-500 rounded"></div>
        </div>

        <div className="bg-[#252526] rounded-lg p-6 shadow-lg">
          <MarkdownPreview content={assignment.details} />
        </div>
      </div>
    </div>
  );
}
