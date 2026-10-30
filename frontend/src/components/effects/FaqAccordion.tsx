"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface FaqItem {
  question: string;
  answer: React.ReactNode;
}

export interface FaqAccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: FaqItem[];
  title?: string;
}

export function FaqAccordion({
  items = [],
  title,
  className,
  ...props
}: FaqAccordionProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto py-4 relative font-sans", className)} {...props}>
      {title && (
        <h2 className="text-center font-bold text-xl md:text-2xl mb-6 text-neutral-500 dark:text-neutral-400 leading-normal overflow-visible">
          {title}
        </h2>
      )}
      
      <ul className="w-full mx-auto list-none p-0 flex flex-col">
        {items.map((item, index) => {
          const isActive = activeIndex === index;
          return (
            <li
              key={index}
              className={cn(
                "w-full relative transition-all duration-300 ease-in",
                "border-b-2 border-neutral-100 dark:border-neutral-800",
                "last:border-b-0",
                isActive ? "border-b border-neutral-200 dark:border-neutral-700" : ""
              )}
            >
              <button
                className={cn(
                  "flex flex-row items-center justify-start w-full min-h-[48px] py-3 relative m-0 px-3 pl-12 cursor-pointer",
                  "border-l-[4px] md:border-l-[6px] transition-colors duration-200 text-left outline-none text-sm md:text-base",
                  isActive 
                    ? "border-l-neutral-900 dark:border-l-neutral-100 bg-neutral-100/50 dark:bg-neutral-800/30 text-neutral-900 dark:text-neutral-100 font-semibold" 
                    : "border-l-neutral-300 dark:border-l-neutral-700 bg-transparent text-neutral-600 dark:text-neutral-400 hover:border-l-neutral-500 dark:hover:border-l-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                )}
                onClick={() => toggleItem(index)}
                aria-expanded={isActive}
              >
                {/* Plus/Minus Icon */}
                <span 
                  className={cn(
                    "absolute left-3 md:left-4 top-1/2 -translate-y-1/2 transition-all duration-200 leading-none",
                    isActive ? "text-[24px] md:text-[28px] font-normal text-neutral-900 dark:text-neutral-100" : "text-[18px] md:text-[22px] font-normal text-neutral-400 dark:text-neutral-500"
                  )}
                >
                  {isActive ? "−" : "+"}
                </span>
                
                <span className="pr-8">{item.question}</span>
                
                {/* Chevron */}
                <span 
                  className={cn(
                    "absolute right-6 block w-2 h-2 border-t-[3px] border-r-[3px] transition-transform duration-200 ease-in-out",
                    isActive ? "rotate-[-44deg] border-neutral-900 dark:border-neutral-100" : "rotate-[133deg] border-neutral-400 dark:border-neutral-500"
                  )}
                />
              </button>

              <div 
                className={cn(
                  "grid transition-all duration-300 ease-in-out w-full",
                  "border-l-[4px] md:border-l-[6px]",
                  isActive ? "grid-rows-[1fr] border-l-neutral-900 dark:border-l-neutral-100 bg-neutral-100/50 dark:bg-neutral-800/30" : "grid-rows-[0fr] border-l-neutral-300 dark:border-l-neutral-700 bg-transparent"
                )}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-row items-start justify-start w-full px-3 pl-12 pb-4 pt-1 text-sm md:text-base font-normal text-neutral-700 dark:text-neutral-300">
                    <span className="opacity-90">{item.answer}</span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default FaqAccordion;
