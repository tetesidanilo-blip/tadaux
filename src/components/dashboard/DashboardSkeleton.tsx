import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const DashboardStatsSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-3 mb-8">
    {[1, 2, 3].map((i) => (
      <Card key={i}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-12" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const SurveyCardSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="flex justify-between items-start">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
          <Skeleton className="h-9 w-full col-span-2" />
          <Skeleton className="h-9 w-full col-span-2" />
          <Skeleton className="h-9 w-full col-span-2" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const DashboardSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    {/* Header skeleton */}
    <div className="flex justify-between items-center mb-8">
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <Skeleton className="h-11 w-36" />
    </div>

    {/* Stats skeleton */}
    <DashboardStatsSkeleton />

    {/* Survey cards skeleton */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SurveyCardSkeleton key={i} />
      ))}
    </div>
  </div>
);
