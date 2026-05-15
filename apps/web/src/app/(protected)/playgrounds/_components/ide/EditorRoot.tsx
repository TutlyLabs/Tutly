"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@tutly/ui/resizable";

import EditorPane from "./EditorPane";
import { useIDE } from "./ideStore";
import type { LayoutNode, SplitNode } from "./types";

export default function EditorRoot() {
  const { state } = useIDE();
  return <RenderNode node={state.layout} />;
}

function RenderNode({ node }: { node: LayoutNode }) {
  if (node.type === "pane") {
    return <EditorPane pane={node} />;
  }
  return <RenderSplit split={node} />;
}

function RenderSplit({ split }: { split: SplitNode }) {
  const children = split.children;
  const evenSize = 100 / children.length;
  const panels: React.ReactNode[] = [];
  children.forEach((child, i) => {
    panels.push(
      <ResizablePanel
        key={`p-${child.id}`}
        id={`p-${child.id}`}
        order={i}
        defaultSize={evenSize}
        minSize={10}
      >
        <RenderNode node={child} />
      </ResizablePanel>,
    );
    if (i < children.length - 1) {
      panels.push(<ResizableHandle key={`h-${child.id}`} />);
    }
  });

  return (
    <ResizablePanelGroup
      direction={split.direction}
      className="min-h-0 min-w-0"
      id={`g-${split.id}`}
      autoSaveId={undefined}
    >
      {panels}
    </ResizablePanelGroup>
  );
}
