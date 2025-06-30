import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey, type NodeKey } from "lexical";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as React from "react";

import { ImageNode } from "./ImageNode";
import Image from "next/image";

const imageCache = new Set();

function useSuspenseImage(src: string) {
  if (!imageCache.has(src)) {
    const error = new Error("Image not loaded");
    error.name = "ImageLoadingError";
    throw error;
  }
}

function LazyImage({
  altText,
  className,
  imageRef,
  src,
  width,
  height,
  maxWidth,
}: {
  altText: string;
  className: string | null;
  height: "inherit" | number;
  imageRef: { current: null | HTMLImageElement };
  maxWidth: number;
  src: string;
  width: "inherit" | number;
}): React.ReactElement {
  useSuspenseImage(src);
  return (
    <Image
      className={className ?? undefined}
      src={src}
      alt={altText}
      ref={imageRef}
      style={{
        height,
        maxWidth,
        width,
      }}
      width={width === "inherit" ? undefined : width}
      height={height === "inherit" ? undefined : height}
    />
  );
}

export default function ImageComponent({
  src,
  altText,
  width,
  height,
  maxWidth,
  nodeKey,
  resizable,
}: {
  altText: string;
  height: "inherit" | number;
  maxWidth: number;
  nodeKey: NodeKey;
  resizable: boolean;
  src: string;
  width: "inherit" | number;
}): React.ReactElement {
  const [editor] = useLexicalComposerContext();
  const imageRef = useRef<null | HTMLImageElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(width);
  const [currentHeight, setCurrentHeight] = useState(height);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const originalDimensions = useRef<{ width: number; height: number }>({
    width: typeof width === "number" ? width : 0,
    height: typeof height === "number" ? height : 0,
  });

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeStartPos.current = { x: e.clientX, y: e.clientY };
      originalDimensions.current = {
        width:
          typeof currentWidth === "number"
            ? currentWidth
            : (imageRef.current?.offsetWidth ?? 0),
        height:
          typeof currentHeight === "number"
            ? currentHeight
            : (imageRef.current?.offsetHeight ?? 0),
      };
    },
    [currentWidth, currentHeight],
  );

  const handleResize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - resizeStartPos.current.x;

      const aspectRatio =
        originalDimensions.current.width / originalDimensions.current.height;
      const newWidth = Math.round(
        Math.max(100, originalDimensions.current.width + deltaX),
      );
      const newHeight = Math.round(Math.max(100, newWidth / aspectRatio));

      setCurrentWidth(newWidth);
      setCurrentHeight(newHeight);
    },
    [isResizing],
  );

  const stopResize = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", stopResize);
    }
    return () => {
      document.removeEventListener("mousemove", handleResize);
      document.removeEventListener("mouseup", stopResize);
    };
  }, [isResizing, handleResize, stopResize]);

  useEffect(() => {
    if (
      !isResizing &&
      imageRef.current &&
      typeof currentWidth === "number" &&
      typeof currentHeight === "number"
    ) {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if (node instanceof ImageNode) {
          node.setWidthAndHeight(currentWidth, currentHeight);
        }
      });
    }
  }, [isResizing, currentWidth, currentHeight, nodeKey, editor]);

  return (
    <Suspense fallback={null}>
      <div className="image-container group relative inline-block">
        <LazyImage
          className={`editor-image ${isResizing ? "pointer-events-none" : ""}`}
          src={src}
          altText={altText}
          imageRef={imageRef}
          width={currentWidth}
          height={currentHeight}
          maxWidth={maxWidth}
        />
        {resizable && (
          <div
            className="absolute -right-0.5 -bottom-0.5 h-4 w-4 cursor-se-resize opacity-0 transition-opacity group-hover:opacity-100"
            onMouseDown={startResize}
            style={{
              transform: "translate(50%, 50%)",
              borderRight: "2px solid #d1d5db",
              borderBottom: "2px solid #d1d5db",
            }}
          />
        )}
      </div>
    </Suspense>
  );
}
