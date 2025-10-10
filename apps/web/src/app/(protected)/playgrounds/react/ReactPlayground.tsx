"use client";

import { Suspense, useState } from "react";

import Playground from "../_components/Playground";
import FolderUpload from "./FileUpload";
import { Skeleton } from "@/components/ui/skeleton";

const ReactPlayground = ({ currentUser }: { currentUser: any }) => {
  const [filesObj, setFilesObj] = useState<Record<string, string> | undefined>(
    undefined,
  );

  return (
    <>
      {!filesObj ? (
        <>
          <h1 className="mt-6 text-center text-2xl font-bold text-orange-300">
            React Playground
          </h1>
          <FolderUpload setFilesObj={setFilesObj} />
        </>
      ) : (
        <Suspense
          fallback={
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
          }
        >
          <Playground
            initialFiles={filesObj}
            template="react"
            currentUser={currentUser}
          />
        </Suspense>
      )}
    </>
  );
};

export default ReactPlayground;
