import { cn } from "@tutly/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.08]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
