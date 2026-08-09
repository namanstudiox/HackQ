import { Skeleton } from "@/components/ui/skeleton";

export default function RoomLoading() {
  return (
    <div className="flex h-dvh flex-col bg-black">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="ml-auto h-8 w-32" />
      </div>
      <div className="flex flex-1 gap-4 p-6">
        <Skeleton className="hidden w-56 md:block" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    </div>
  );
}
