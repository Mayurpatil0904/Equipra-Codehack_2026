"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface LayoutTextFlipProps {
  text: string;
  words: string[];
  intervalMs?: number;
  className?: string;
}

export function LayoutTextFlip({ text, words, intervalMs = 3000, className }: LayoutTextFlipProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-1.5", className)}>
      <motion.span layout className="text-neutral-600 dark:text-white/75">
        {text}
      </motion.span>

      <motion.span layout className="relative inline-block overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={words[index]}
            initial={{ y: 14, opacity: 0, filter: "blur(6px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: -14, opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="inline-block whitespace-nowrap font-bold text-neutral-900 dark:text-white"
          >
            {words[index]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </div>
  );
}

export default LayoutTextFlip;
