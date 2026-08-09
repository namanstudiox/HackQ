import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" className="flex min-h-screen w-full flex-col overflow-hidden bg-black">
      {/* Navbar skeleton */}
      <div className="flex h-20 w-full items-center justify-between px-5 sm:px-8 lg:px-10">
        <Skeleton className="h-7 w-24" />
        <div className="hidden items-center gap-12 md:flex">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>

      {/* Hero copy skeleton */}
      <div className="flex flex-1 flex-col justify-center px-5 pt-4 sm:px-8 lg:px-12">
        <Skeleton className="h-10 w-[72%] max-w-lg" />
        <Skeleton className="mt-4 h-10 w-[52%] max-w-md" />
        <Skeleton className="mt-9 h-5 w-96 max-w-full" />
        <Skeleton className="mt-4 h-5 w-80 max-w-full" />
        <Skeleton className="mt-12 h-5 w-40" />
      </div>
    </div>
  );
}
