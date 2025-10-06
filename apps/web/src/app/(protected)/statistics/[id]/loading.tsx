import { Skeleton } from "@/components/ui/skeleton";

export default function StatisticsDetailLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* Course navigation skeleton */}
      <div className="mx-4 mb-2 flex items-center gap-2 md:mx-8">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Main content skeleton */}
      <div className="mx-4 flex flex-col gap-4 md:mx-8 md:gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          <Skeleton className="h-[300px] w-full rounded-xl md:w-1/3" />
          <Skeleton className="h-[300px] w-full rounded-xl md:w-3/4" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    </div>
  );
}
