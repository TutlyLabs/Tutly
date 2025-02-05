import { redirect } from "next/navigation";

import { getSession } from "@tutly/auth";

import { AppHeader } from "~/components/sidebar/AppHeader";
import { AppSidebar } from "~/components/sidebar/AppSidebar";

interface LayoutProps {
  children: React.ReactNode;
  params: { forceClose?: boolean };
}

const RootLayout = async ({ children, params }: LayoutProps) => {
  const session = await getSession();
  const user = session?.user;

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative">
        <AppSidebar forceClose={params.forceClose} user={user} />
      </div>
      <main className="w-full">
        <AppHeader user={user} />
        <div className="p-4">{children}</div>
      </main>
    </div>
  );
};

export default RootLayout;
