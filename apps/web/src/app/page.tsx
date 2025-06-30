import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import NoDataFound from "@/components/NoDataFound";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const Page = async () => {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/sign-in");
  } else {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <NoDataFound
        message="You are not supposed to be on this page"
        additionalMessage="You’ve taken a wrong turn! Let’s get you back on track."
      />
      <Link href="/dashboard">
        <Button className="mt-4">Return to Home</Button>
      </Link>
    </div>
  );
};

export default Page;
