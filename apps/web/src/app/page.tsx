export const dynamic = "force-dynamic";

import { getServerSessionOrRedirect } from "@/lib/auth";
import { redirect } from "next/navigation";

const Page = async () => {
  await getServerSessionOrRedirect();
  redirect("/dashboard");
};

export default Page;
