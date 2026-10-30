"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface StackedShowcaseColumn {
  label: string;
  count: string;
  items: string[];
}

export interface StackedShowcaseProps {
  columns: StackedShowcaseColumn[];
  intervalSeconds?: number;
  className?: string;
}

export function StackedShowcase({ columns, intervalSeconds = 2.6, className }: StackedShowcaseProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const maxItems = Math.max(1, ...columns.map((c) => c.items.length || 1));
  const cycleDuration = intervalSeconds * maxItems;

  const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    containerRef.current.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    containerRef.current.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("stacked-showcase relative w-full", className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={(e) => {
        e.currentTarget.querySelectorAll<HTMLElement>(".stacked-showcase__glow").forEach((el) => (el.style.opacity = "1"));
      }}
      onMouseLeave={(e) => {
        e.currentTarget.querySelectorAll<HTMLElement>(".stacked-showcase__glow").forEach((el) => (el.style.opacity = "0"));
      }}
    >
      <div
        ref={gridRef}
        className="grid relative w-full"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        <div
          className="stacked-showcase__glow pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 z-10"
          style={{
            background:
              "radial-gradient(480px circle at var(--mouse-x, 0) var(--mouse-y, 0), hsl(var(--primary) / 0.12), transparent 70%)",
          }}
        />
        <div
          className="stacked-showcase__glow pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 z-20"
          style={{
            background:
              "radial-gradient(560px circle at var(--mouse-x, 0) var(--mouse-y, 0), hsl(var(--primary) / 0.9), transparent 40%)",
            WebkitMaskImage:
              "repeating-linear-gradient(to right, black 0, black 1px, transparent 1px, transparent 100%), linear-gradient(to bottom, black 0, black 1px, transparent 1px, transparent calc(100% - 1px), black calc(100% - 1px), black 100%)",
            maskComposite: "add",
            WebkitMaskComposite: "source-over",
          }}
        />

        {columns.map((col, colIndex) => (
          <div key={col.label} className="relative flex flex-col">
            <div className="absolute top-0 bottom-0 right-0 w-px bg-border" />
            <div className="absolute left-0 right-0 top-0 h-px bg-border" />
            <div className="absolute left-0 right-0 bottom-0 h-px bg-border" />
            {colIndex === 0 && <div className="absolute top-0 bottom-0 left-0 w-px bg-border" />}

            <div className="text-center pt-6 pb-2">
              <div className="font-display text-2xl md:text-3xl font-bold text-primary">{col.count}</div>
              <div className="text-xs text-muted-foreground font-medium mt-1">{col.label}</div>
            </div>

            <div className="relative h-14 mx-4 mb-6 overflow-hidden">
              {(col.items.length > 0 ? col.items : ["—"]).map((item, i) => (
                <span
                  key={`${col.label}-${i}`}
                  className="absolute inset-0 flex items-center justify-center text-sm font-medium text-foreground/80 px-2 text-center truncate"
                  style={{
                    animationName: "eq-stack-cycle",
                    animationDuration: `${cycleDuration}s`,
                    animationDelay: `${i * intervalSeconds}s`,
                    animationIterationCount: "infinite",
                    animationTimingFunction: "ease-in-out",
                    opacity: 0,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StackedShowcase;
