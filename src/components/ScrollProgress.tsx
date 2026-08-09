"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * GSAP ScrollTrigger effects:
 * 1. Lime scroll-progress bar pinned to the very top of the viewport.
 * 2. Navbar auto-hides when scrolling down and reveals when scrolling up
 *    (desktop only, skipped for reduced-motion users).
 */
export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Top progress bar — scrubbed with scroll.
      if (barRef.current) {
        gsap.to(barRef.current, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            start: 0,
            end: "max",
            scrub: 0.3,
          },
        });
      }

      // Navbar hide/reveal (desktop only, not for reduced-motion users).
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduceMotion) return;
      if (!window.matchMedia("(min-width: 768px)").matches) return;

      const navbar = document.querySelector<HTMLElement>("[data-navbar]");
      if (!navbar) return;

      let hiding = false;
      ScrollTrigger.create({
        start: "top top",
        end: "max",
        onUpdate: (self) => {
          const shouldHide = self.direction === 1 && self.scroll() > 120;
          if (shouldHide !== hiding) {
            hiding = shouldHide;
            gsap.to(navbar, {
              yPercent: shouldHide ? -100 : 0,
              duration: 0.4,
              ease: "power2.out",
              overwrite: "auto",
            });
          }
        },
      });

      // If the viewport shrinks below the desktop breakpoint, reveal the
      // navbar and stop hiding it.
      const mobile = () => window.innerWidth < 768;
      const onResize = () => {
        if (mobile() && hiding) {
          hiding = false;
          gsap.to(navbar, {
            yPercent: 0,
            duration: 0.3,
            ease: "power2.out",
            overwrite: "auto",
          });
        }
      };
      window.addEventListener("resize", onResize);

      // Runs when ctx.revert() fires on unmount.
      return () => window.removeEventListener("resize", onResize);
    });

    return () => ctx.revert();
  }, []);


  return (
    <div
      ref={barRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[70] h-[2px] w-full origin-left scale-x-0 bg-[#9eff00] shadow-[0_0_12px_rgba(158,255,0,0.6)]"
    />
  );
}
