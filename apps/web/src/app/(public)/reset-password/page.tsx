import ManagePassword from "@/app/(protected)/profile/_components/ManagePassword";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center">
      <ManagePassword initialEmail={email} />
    </div>
  );
}
