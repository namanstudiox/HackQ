"use client";

import { motion } from "motion/react";

interface LetterRevealProps {
  lines: string[];
  /** Seconds between each character. */
  charDelay?: number;
  /** Extra seconds before the first line starts. */
  startDelay?: number;
  /** Seconds between the start of each line. */
  lineGap?: number;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function LetterReveal({
  lines,
  charDelay = 0.035,
  startDelay = 0.15,
  lineGap = 0.28,
}: LetterRevealProps) {
  return (
    <span aria-hidden className="block">
      {lines.map((line, li) => (
        <span key={line} className="block whitespace-nowrap">
          {line
            .replace(/ /g, "\u00A0")
            .split("")
            .map((char, ci) => (
              <span
                key={ci}
                className="inline-block overflow-hidden align-bottom"
              >
                <motion.span
                  className="inline-block will-change-transform"
                  initial={{
                    y: "1.15em",
                    opacity: 0,
                    rotateX: 45,
                    transformPerspective: 800,
                  }}
                  animate={{ y: 0, opacity: 1, rotateX: 0 }}
                  transition={{
                    duration: 0.75,
                    ease: EASE,
                    delay: startDelay + li * lineGap + ci * charDelay,
                  }}
                >
                  {char}
                </motion.span>
              </span>
            ))}
        </span>
      ))}
    </span>
  );
}
