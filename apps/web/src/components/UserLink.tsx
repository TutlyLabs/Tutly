import Link from "next/link";
import { cn } from "@tutly/utils";

export function UserLink({
  username,
  className,
  children,
  stopPropagation,
  target,
}: {
  username: string;
  className?: string;
  children: React.ReactNode;
  stopPropagation?: boolean;
  target?: "_blank";
}) {
  return (
    <Link
      href={`/u/${username}`}
      className={cn("hover:underline", className)}
      target={target}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      {children}
    </Link>
  );
}
