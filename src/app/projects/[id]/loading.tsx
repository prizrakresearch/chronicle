import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectLoading() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 h-14 flex items-center px-6 gap-3">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16 rounded-full ml-2" />
      </div>
      <div className="px-6 py-4 space-y-4">
        <div className="flex gap-4 border-b border-zinc-800 pb-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-20" />
          ))}
        </div>
        <div className="space-y-3 max-w-2xl">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}
