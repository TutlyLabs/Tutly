import { redirect } from "next/navigation";
import Dashboard from "./_components/dashboard";
import { getServerSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/sign-in");
  }

  if (session.user.role === "SUPER_ADMIN") {
    redirect("/super-admin");
  }

  const currentUser = session.user;

  return <Dashboard name={currentUser.name} currentUser={currentUser} />;
}
