import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading({ fields }: { fields: number }) {
  return (
    <div
      aria-busy="true"
      className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-[#151518] px-5 py-8"
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#27272c_0%,#131316_55%,#0a0a0c_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_50px_120px_-32px_rgba(0,0,0,0.9)]">
        <div className="grid md:grid-cols-[1.15fr_1fr]">
          <div className="p-7 sm:p-12">
            <Skeleton className="h-6 w-28 bg-white/10" />
            <Skeleton className="mt-8 h-9 w-44 bg-white/10" />
            <Skeleton className="mt-3 h-4 w-72 max-w-full bg-white/10" />
            <div className="mt-9 flex flex-col gap-4">
              {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-20 bg-white/10" />
                  <Skeleton className="h-11 w-full rounded-lg bg-white/5" />
                </div>
              ))}
              <Skeleton className="mt-1 h-11 w-full rounded-lg bg-matte/40" />
            </div>
          </div>
          <div className="hidden md:block">
            <div className="h-full min-h-[16rem] w-full bg-[#0b0b0d]" />
          </div>
        </div>
      </div>
    </div>
  );
}
