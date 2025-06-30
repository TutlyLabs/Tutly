"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import PlaygroundPage from "./PlaygroundPage";
import { SubmissionList } from "./submissionList";

interface ResizablePanelLayoutProps {
  assignmentId: string;
  assignment: any;
  submissions: any[];
  submissionId?: string;
  username?: string;
  submission: any;
}

const ResizablePanelLayout = ({
  assignmentId,
  assignment,
  submissions,
  submissionId,
  username,
  submission,
}: ResizablePanelLayoutProps) => {
  return (
    <ResizablePanelGroup direction="horizontal" className="max-h-[95vh] w-full">
      <ResizablePanel defaultSize={15}>
        <SubmissionList
          assignmentId={assignmentId}
          assignment={assignment}
          submissions={submissions}
          searchParams={{ submissionId, username }}
          username={username}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={85}>
        <PlaygroundPage submission={submission} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default ResizablePanelLayout;
