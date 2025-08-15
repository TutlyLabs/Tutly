"use client";

import { api } from "@/trpc/react";
import StudentCertificate from "./_components/StudentCertificate";

export default function CertificatePage() {
  const { data: certificateData, isLoading } =
    api.certificates.getStudentCertificateData.useQuery();

  if (isLoading) {
    return <div>Loading certificate data...</div>;
  }

  if (!certificateData?.success || !certificateData.data) {
    return <div>Failed to load certificate data or access denied.</div>;
  }

  const { courses, currentUser } = certificateData.data;

  return (
    <div>
      <StudentCertificate user={currentUser} data={{ courses, currentUser }} />
    </div>
  );
}
