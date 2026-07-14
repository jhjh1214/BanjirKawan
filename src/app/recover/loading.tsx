import { Card, Skeleton } from "@/components/ui";

// Route-transition skeleton while the eligible-shop list is fetched.
export default function RecoverLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-5 w-full max-w-md" />
      <Card className="mt-8 p-6">
        <div className="space-y-5">
          <div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-10 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-2 h-10 w-full" />
          </div>
          <Skeleton className="h-14 w-full" />
        </div>
      </Card>
    </div>
  );
}
