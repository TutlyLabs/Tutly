"use client";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import Drive from "./_components/Drive";

export default function DrivePage() {
  const q = api.drive.getUserFiles.useQuery();
  if (q.isLoading) return <PageLoader />;
  if (!q.data?.success || !q.data.data) {
    return <div>Failed to load files.</div>;
  }
  return <Drive uploadedFiles={q.data.data} />;
}
