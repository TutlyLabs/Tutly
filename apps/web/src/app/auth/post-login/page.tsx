export const dynamic = "force-dynamic";

import { getServerSessionOrRedirect } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function PostLoginPage() {
  const session = await getServerSessionOrRedirect();

  const credentialAccount = await db.account.findFirst({
    where: { userId: session.user.id, providerId: "credential" },
    select: { id: true },
  });

  if (!credentialAccount) {
    redirect("/change-password");
  }

  redirect("/dashboard");
}
