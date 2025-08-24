import { api } from "@/trpc/server";
import StudentCertificate from "./_components/StudentCertificate";

export default async function CertificatePage() {
  const certificateData = await api.certificates.getStudentCertificateData();

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
