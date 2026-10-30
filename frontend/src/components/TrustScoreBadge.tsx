// frontend/src/components/TrustScoreBadge.tsx
import React, { useState } from "react";
import { ShieldCheck, Zap, Award, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrustScoreModal } from "./TrustScoreModal";

interface Props {
  score?: number;
  tier?: "PLATINUM" | "GOLD" | "SILVER" | "BRONZE" | string;
  isPriorityPass?: boolean;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
  showModalOnClick?: boolean;
  userId?: string;
  className?: string;
}

export function TrustScoreBadge({
  score = 75,
  tier = "SILVER",
  isPriorityPass = false,
  size = "md",
  showScore = true,
  showModalOnClick = true,
  userId,
  className,
}: Props) {
  const [openModal, setOpenModal] = useState(false);

  const normalizedTier = (tier || "SILVER").toUpperCase();

  const tierConfig: Record<
    string,
    { label: string; bg: string; text: string; border: string; glow: string; icon: any }
  > = {
    PLATINUM: {
      label: "VIP Platinum",
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
      text: "text-purple-600 dark:text-purple-300",
      border: "border-purple-500/30",
      glow: "shadow-[0_0_12px_rgba(168,85,247,0.35)]",
      icon: Sparkles,
    },
    GOLD: {
      label: "Trusted Gold",
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      text: "text-amber-600 dark:text-amber-300",
      border: "border-amber-500/30",
      glow: "shadow-[0_0_10px_rgba(234,179,8,0.25)]",
      icon: Award,
    },
    SILVER: {
      label: "Active Silver",
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      text: "text-blue-600 dark:text-blue-300",
      border: "border-blue-500/30",
      glow: "",
      icon: ShieldCheck,
    },
    BRONZE: {
      label: "Probationary",
      bg: "bg-rose-500/10 dark:bg-rose-500/20",
      text: "text-rose-600 dark:text-rose-300",
      border: "border-rose-500/30",
      glow: "",
      icon: AlertCircle,
    },
  };

  const cfg = tierConfig[normalizedTier] || tierConfig.SILVER;
  const Icon = cfg.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] gap-1 rounded-md",
    md: "px-2.5 py-1 text-xs gap-1.5 rounded-lg",
    lg: "px-3.5 py-1.5 text-sm gap-2 rounded-xl",
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          if (showModalOnClick) {
            e.stopPropagation();
            setOpenModal(true);
          }
        }}
        className={cn(
          "inline-flex items-center font-semibold border transition-all duration-200",
          cfg.bg,
          cfg.text,
          cfg.border,
          cfg.glow,
          sizeClasses[size],
          showModalOnClick ? "cursor-pointer hover:scale-105" : "cursor-default",
          className
        )}
        title="Student Accountability & Trust Score"
      >
        <Icon className={size === "sm" ? "h-3 w-3" : size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        <span>{cfg.label}</span>
        {showScore && <span className="opacity-90 font-mono font-bold">({score})</span>}
        {isPriorityPass && (
          <span className="flex items-center gap-0.5 text-[10px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-500 font-bold uppercase tracking-wider ml-0.5">
            <Zap className="h-2.5 w-2.5 fill-amber-500" />
            Pass
          </span>
        )}
      </button>

      {openModal && (
        <TrustScoreModal
          userId={userId}
          initialScore={score}
          initialTier={normalizedTier}
          onClose={() => setOpenModal(false)}
        />
      )}
    </>
  );
}
