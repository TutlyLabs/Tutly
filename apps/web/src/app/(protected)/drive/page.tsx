import { api } from "@/trpc/server";
import Drive from "./_components/Drive";

export default async function DrivePage() {
  const filesData = await api.drive.getUserFiles();

  if (!filesData?.success || !filesData.data) {
    return <div>Failed to load files.</div>;
  }

  return <Drive uploadedFiles={filesData.data} />;
}
