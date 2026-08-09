"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Lenis smooth scrolling, driven by GSAP's ticker (single rAF loop).
 * The instance is exposed on window.__lenis so anchor clicks can route
 * through lenis.scrollTo (see lib/smooth-scroll.ts).
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Skip touch-first devices — Lenis mainly enhances wheel scrolling.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const lenis = new Lenis({
      lerp: 0.09,
      smoothWheel: true,
      autoRaf: false, // we drive raf through GSAP's ticker
    });
    window.__lenis = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.lagSmoothing(1);
      gsap.ticker.remove(raf);
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);

  return null;
}
