import { Skeleton } from "@tutly/ui/skeleton";

export default function StatisticsDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <Skeleton className="h-7 w-40" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <Skeleton className="h-[300px] w-full rounded-xl md:w-1/3" />
        <Skeleton className="h-[300px] w-full rounded-xl md:w-2/3" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}
