import { Card, Skeleton } from "@/components/ui";

// Route-transition skeleton for the status dashboard.
export default function HomeLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Skeleton className="h-9 w-3/4 max-w-lg" />
      <Skeleton className="mt-3 h-5 w-1/2 max-w-sm" />
      <div className="mt-6 flex gap-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Card className="mt-8 p-6">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-36 rounded-full" />
        </div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}
