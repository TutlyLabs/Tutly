import { api } from "@/trpc/server";
import ChangePassword from "@/app/(protected)/profile/_components/ChangePassword";

export default async function ChangePasswordPage() {
  const passwordData = await api.users.checkUserPassword();

  if (!passwordData?.success || !passwordData.data) {
    return <div>Failed to load user data.</div>;
  }

  const { isPasswordExists, email } = passwordData.data;

  return (
    <div>
      <ChangePassword isPasswordExists={isPasswordExists} email={email ?? ""} />
    </div>
  );
}
