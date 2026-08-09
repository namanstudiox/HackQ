"use client";

import { useState } from "react";
import { scrollToHash } from "@/lib/smooth-scroll";

const links = [
  { label: "System", href: "#system" },
  { label: "Workflow", href: "#workflow" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const handleAnchor = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    e.preventDefault();
    scrollToHash(href);
    setOpen(false);
  };

  return (
    <nav data-navbar className="navbar fixed inset-x-0 top-0 z-50 w-full bg-transparent">
      <div className="relative flex h-20 w-full items-center px-5 sm:px-8 lg:px-10">
        {/* Brand (hard left) */}
        <a
          href="#top"
          onClick={(e) => handleAnchor(e, "#top")}
          className="shrink-0 text-2xl font-normal tracking-[-0.02em] text-white sm:text-3xl"
        >
          HACKQ
        </a>

        {/* Center links (dead center of viewport) */}
        <ul className="pointer-events-auto absolute left-1/2 hidden -translate-x-1/2 items-center gap-12 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={(e) => handleAnchor(e, l.href)}
                className="text-[15px] font-medium tracking-wide text-white/70 transition hover:text-white"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA (hard right) */}
        <div className="ml-auto flex items-center gap-3">
          <a
            href="#system"
            onClick={(e) => handleAnchor(e, "#system")}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black transition hover:-translate-y-0.5"
          >
            Launch HackQ
            <span className="text-base leading-none">→</span>
          </a>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white md:hidden"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M2 4h12M2 8h12M2 12h12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`${
          open ? "flex" : "hidden"
        } flex-col gap-1 border-t border-white/10 bg-black/80 px-6 py-4 backdrop-blur-md md:hidden`}
      >
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={(e) => handleAnchor(e, l.href)}
            className="rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
          >
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
