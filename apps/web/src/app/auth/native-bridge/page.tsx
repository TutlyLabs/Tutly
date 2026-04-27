import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

export default async function NativeBridge({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();

  for (const name of COOKIE_NAMES) {
    const c = cookieStore.get(name);
    if (c?.value) {
      const next = params.next ?? "/dashboard";
      const url = new URL("tutly://auth/callback");
      url.searchParams.set("token", c.value);
      url.searchParams.set("next", next);
      redirect(url.toString());
    }
  }

  const errUrl = new URL("tutly://auth/callback");
  errUrl.searchParams.set("error", params.error ?? "no_session");
  redirect(errUrl.toString());
}
