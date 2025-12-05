/// <reference path="./vscode-elements.d.ts" />
import React, { useEffect, useState } from "react";
import "@vscode-elements/elements/dist/vscode-tabs";
import "@vscode-elements/elements/dist/vscode-tab-header";
import "@vscode-elements/elements/dist/vscode-tab-panel";
import { QuestionTab } from "./components/QuestionTab";
import { TestsTab } from "./components/TestsTab";
import { PreviewTab } from "./components/PreviewTab";

interface Assignment {
  id: string;
  title: string;
  details: string;
  detailsJson?: any;
}

export function App() {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const assignmentId = (window as any).ASSIGNMENT_ID;
    const assignmentData = (window as any).ASSIGNMENT_DATA;

    if (!assignmentId) {
      setError("No assignment ID provided");
      setLoading(false);
      return;
    }

    if (!assignmentData) {
      setError("Failed to load assignment data");
      setLoading(false);
      return;
    }

    const assignmentInfo = assignmentData?.assignment;
    if (assignmentInfo) {
      setAssignment({
        id: assignmentInfo.id,
        title: assignmentInfo.title,
        details: assignmentInfo.details,
        detailsJson: assignmentInfo.detailsJson,
      });
    } else {
      setError("Assignment not found");
    }

    setLoading(false);
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
    <div className="h-screen flex flex-col bg-[#1e1e1e]">
      <vscode-tabs selected-index="0" className="flex-1 flex flex-col" style={{ height: '100%' }}>
        <vscode-tab-header slot="header">Question</vscode-tab-header>
        <vscode-tab-header slot="header">Tests</vscode-tab-header>
        <vscode-tab-header slot="header">Preview</vscode-tab-header>

        <vscode-tab-panel style={{ height: '100%', overflow: 'auto' }}>
          <QuestionTab assignment={assignment} />
        </vscode-tab-panel>

        <vscode-tab-panel style={{ height: '100%', overflow: 'hidden' }}>
          <TestsTab />
        </vscode-tab-panel>

        <vscode-tab-panel style={{ height: '100%', overflow: 'hidden' }}>
          <PreviewTab />
        </vscode-tab-panel>
      </vscode-tabs>
    </div>
  );
}
