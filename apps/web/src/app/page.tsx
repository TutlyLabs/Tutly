export const dynamic = "force-dynamic";

import {
  getServerSessionOrRedirect,
  getPostLoginRedirectUrl,
} from "@/lib/auth";
import { redirect } from "next/navigation";

const Page = async () => {
  const session = await getServerSessionOrRedirect();

  const redirectUrl = await getPostLoginRedirectUrl(session.user);
  redirect(redirectUrl);
};

export default Page;
