"use client";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import StudentCertificate from "./_components/StudentCertificate";

export default function CertificatePage() {
  const q = api.certificates.getStudentCertificateData.useQuery();
  if (q.isLoading) return <PageLoader />;
  if (q.isError || !q.data) {
    return (
      <div className="text-muted-foreground bg-card flex h-64 items-center justify-center rounded-xl border text-sm">
        Failed to load certificate data or access denied.
      </div>
    );
  }
  const { courses, currentUser } = q.data;
  return (
    <StudentCertificate user={currentUser} data={{ courses, currentUser }} />
  );
}
