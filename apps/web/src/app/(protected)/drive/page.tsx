"use client";

import { api } from "@/trpc/react";
import Drive from "./_components/Drive";

export default function DrivePage() {
  const { data: filesData, isLoading } = api.drive.getUserFiles.useQuery();

  if (isLoading) {
    return <div>Loading files...</div>;
  }

  if (!filesData?.success || !filesData.data) {
    return <div>Failed to load files.</div>;
  }

  return <Drive uploadedFiles={filesData.data} />;
}
