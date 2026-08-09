import { memo } from "react";

/**
 * Abstract fluid-gradient artwork panel — the right half of the auth card.
 * Dark glossy variant: electric-blue + warm gold mesh glows on near-black,
 * echoing the reference design while matching the glossy-black card.
 * Purely decorative (aria-hidden).
 */
function AuthArtwork() {
  return (
    <div
      aria-hidden
      className="relative h-full min-h-[16rem] w-full overflow-hidden bg-[#0b0b0d]"
    >
      {/* Base wash */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_18%_8%,#1b1b20_0%,#0e0e11_60%,#08080a_100%)]" />

      {/* Flowing mesh strokes */}
      <div className="artwork-blob absolute -left-14 top-[18%] h-72 w-72 rounded-full bg-[#2e6bff] opacity-30 blur-3xl" />
      <div
        className="artwork-blob absolute -right-10 top-[6%] h-80 w-80 rounded-full bg-[#4f8bff] opacity-25 blur-3xl"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="artwork-blob absolute -bottom-12 left-[16%] h-80 w-80 rounded-full bg-[#1e3fae] opacity-30 blur-3xl"
        style={{ animationDelay: "-11s" }}
      />
      <div
        className="artwork-blob absolute bottom-[14%] right-[12%] h-56 w-56 rounded-full bg-[#a6c83a] opacity-25 blur-2xl"
        style={{ animationDelay: "-3s" }}
      />
      <div
        className="artwork-blob absolute left-[38%] top-[30%] h-44 w-44 rounded-full bg-white opacity-10 blur-2xl"
        style={{ animationDelay: "-14s" }}
      />

      {/* Loop motif */}
      <svg
        viewBox="0 0 200 200"
        fill="none"
        className="absolute right-[14%] top-[12%] h-40 w-40 opacity-30 mix-blend-soft-light"
      >
        <circle cx="86" cy="100" r="44" stroke="white" strokeWidth="2" />
        <circle cx="120" cy="100" r="44" stroke="white" strokeWidth="2" />
      </svg>
    </div>
  );
}

export default memo(AuthArtwork);
