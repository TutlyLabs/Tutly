"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Client-side <Redirect /> equivalent. Renders nothing and replaces the
// current history entry once mounted.
export function Navigate({
  to,
  replace = true,
}: {
  to: string;
  replace?: boolean;
}) {
  const router = useRouter();
  useEffect(() => {
    if (replace) router.replace(to);
    else router.push(to);
  }, [to, replace, router]);
  return null;
}
