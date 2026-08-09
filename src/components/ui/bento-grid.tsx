"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps {
  name: string;
  className?: string;
  visual: ReactNode;
  icon: ReactNode;
  description: string;
  contentClassName?: string;
  fill?: boolean;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

const BentoGrid = ({ children, className }: BentoGridProps) => {
  return (
    <motion.div
      className={cn(
        "grid w-full auto-rows-[16rem] grid-cols-1 gap-4 lg:grid-cols-5",
        className
      )}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
    >
      {children}
    </motion.div>
  );
};

const BentoCard = ({
  name,
  className,
  visual,
  icon,
  description,
  contentClassName,
  fill = false,
}: BentoCardProps) => (
  <motion.div variants={cardVariants} className={cn("h-full", className)}>
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#9eff00]/40 hover:shadow-[0_24px_60px_-24px_rgba(158,255,0,0.25)]">
      {/* Full-bleed visual (e.g. globe) */}
      {fill && <div className="absolute inset-0">{visual}</div>}

      {/* Content */}
      <div className={cn("relative z-10 flex flex-col gap-1.5 p-5", contentClassName)}>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#9eff00]/25 bg-[#9eff00]/10 transition-all duration-300 group-hover:bg-[#9eff00]/15 group-hover:shadow-[0_0_20px_rgba(158,255,0,0.25)]">
          {icon}
        </div>
        <h3 className="text-base font-semibold tracking-tight text-neutral-100">{name}</h3>
        <p className="text-sm leading-relaxed text-neutral-400">{description}</p>
      </div>

      {/* Visual zone (never overlaps the text) */}
      {!fill && (
        <div className="relative mt-auto flex min-h-[6.5rem] flex-1 items-center justify-center overflow-hidden px-4 pb-4 transition-transform duration-500 group-hover:scale-[1.04]">
          {visual}
        </div>
      )}

      {/* Subtle hover wash */}
      <div className="pointer-events-none absolute inset-0 transition-colors duration-300 group-hover:bg-white/[0.02]" />
    </div>
  </motion.div>
);

export { BentoCard, BentoGrid };
