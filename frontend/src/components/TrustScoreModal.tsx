// frontend/src/components/TrustScoreModal.tsx
import React, { useEffect, useState } from "react";
import {
  X,
  ShieldCheck,
  Zap,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { trustScoreApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  userId?: string;
  initialScore?: number;
  initialTier?: string;
  onClose: () => void;
}

export function TrustScoreModal({ userId, initialScore = 75, initialTier = "SILVER", onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScore() {
      try {
        setLoading(true);
        const res = userId
          ? await trustScoreApi.getUser(userId)
          : await trustScoreApi.getMine();
        setData(res);
      } catch (err) {
        console.error("Failed to load trust score", err);
      } finally {
        setLoading(false);
      }
    }
    fetchScore();
  }, [userId]);

  const score = data?.score ?? initialScore;
  const tier = data?.tier ?? initialTier;
  const isPriorityPass = data?.isPriorityPass ?? (score >= 75);
  const perks = data?.perks ?? [
    "Standard lab equipment borrowing (up to 2 items)",
    "Standard request processing queue",
  ];
  const stats = data?.stats ?? {
    onTimeRate: 100,
    completedRequests: 0,
    onTimeReturns: 0,
    earlyReturns: 0,
    faultScansRun: 0,
    overdueCount: 0,
  };

  // Color theme by score
  const isPlatinum = score >= 90;
  const isGold = score >= 75 && score < 90;
  const isSilver = score >= 50 && score < 75;

  const accentColor = isPlatinum
    ? "from-purple-600 to-indigo-600"
    : isGold
    ? "from-amber-500 to-orange-500"
    : isSilver
    ? "from-blue-600 to-cyan-600"
    : "from-rose-600 to-red-600";

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header with gradient banner */}
        <div className={cn("p-6 text-white bg-gradient-to-r relative", accentColor)}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              {isPlatinum ? (
                <Sparkles className="h-6 w-6 text-amber-300" />
              ) : isGold ? (
                <Award className="h-6 w-6 text-yellow-200" />
              ) : (
                <ShieldCheck className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold font-display">
                  {data?.studentName ? `${data.studentName}'s Passport` : "Student Accountability Passport"}
                </h2>
                {isPriorityPass && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-bold uppercase tracking-wider">
                    <Zap className="h-3 w-3 fill-amber-300 text-amber-300" />
                    Priority Pass Active
                  </span>
                )}
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                {data?.enrollmentId ? `Student ID: ${data.enrollmentId} • Verified Hardware Standing` : "Dynamic Trust Score powered by on-time hardware returns and care"}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm">Calculating real-time accountability metrics…</p>
            </div>
          ) : (
            <>
              {/* Score Gauge & Tier Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-muted/40 p-4 rounded-xl border border-border">
                <div className="flex flex-col items-center sm:items-start">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    Current Trust Score
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-extrabold font-display text-foreground">{score}</span>
                    <span className="text-sm text-muted-foreground font-medium">/ 100</span>
                  </div>
                  {/* Visual Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-2.5 mt-3 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", accentColor)}
                      style={{ width: `${Math.min(100, score)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    {score >= 90
                      ? "Maximum Trust Level — Top 5% in University"
                      : score >= 75
                      ? "High Standing — Eligible for Fast-Track"
                      : "Good Standing — Maintain on-time returns for Gold"}
                  </span>
                </div>

                <div className="flex flex-col sm:border-l sm:border-border sm:pl-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Accountability Tier</span>
                    <span className="font-bold text-foreground">
                      {tier === "PLATINUM"
                        ? "VIP Platinum"
                        : tier === "GOLD"
                        ? "Trusted Gold"
                        : tier === "SILVER"
                        ? "Active Silver"
                        : "Probationary"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Concurrent Borrow Limit</span>
                    <span className="font-bold text-primary">{data?.maxConcurrentItems ?? 2} Equipment Items</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Auto-Approval Status</span>
                    <span
                      className={cn(
                        "font-bold",
                        data?.autoApprovalEligible ? "text-emerald-500" : "text-muted-foreground"
                      )}
                    >
                      {data?.autoApprovalEligible ? "Eligible (Dev Kits)" : "Standard Review"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Highlights */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Verified Lab History
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div className="p-3 bg-card border border-border rounded-xl">
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {stats.onTimeRate}%
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">On-Time Rate</div>
                  </div>
                  <div className="p-3 bg-card border border-border rounded-xl">
                    <div className="text-base font-bold text-foreground">{stats.completedRequests}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Returned</div>
                  </div>
                  <div className="p-3 bg-card border border-border rounded-xl">
                    <div className="text-base font-bold text-purple-600 dark:text-purple-400">
                      +{data?.scoreBreakdown?.earlyReturnBonus ?? 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Early Bonus</div>
                  </div>
                  <div className="p-3 bg-card border border-border rounded-xl">
                    <div className="text-base font-bold text-amber-500">
                      {stats.priorityPassesUsed ?? 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Fast-Tracks</div>
                  </div>
                  <div className="p-3 bg-card border border-border rounded-xl">
                    <div
                      className={cn(
                        "text-base font-bold",
                        stats.overdueCount > 0 ? "text-rose-500" : "text-emerald-500"
                      )}
                    >
                      {stats.overdueCount}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Late Returns</div>
                  </div>
                </div>
              </div>

              {/* Unlocked Perks */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-primary" />
                  Unlocked Tier Privileges &amp; Priority Burn
                </h3>
                <div className="space-y-2">
                  {perks.map((p: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 text-xs text-foreground bg-muted/30 p-2.5 rounded-lg border border-border/50"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to level up & Priority Pass Mechanic */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 text-xs text-muted-foreground space-y-1.5">
                <div className="font-semibold text-primary flex items-center gap-1">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Trust Score Rules &amp; Urgent Priority Pass:
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>
                    <strong className="text-foreground">⚡ Urgent Fast-Track (Burn 15 pts):</strong> Students with a score ≥60 can burn 15 Trust points to jump to the top of the faculty &amp; lab approval queue. Points recover as you return items on-time.
                  </li>
                  <li>
                    <strong className="text-foreground">On-Time Return (+4 pts):</strong> Earn +4 points for every lab equipment returned on or before the deadline.
                  </li>
                  <li>
                    <strong className="text-foreground">Early Return (+2 pts):</strong> Returning equipment 4+ hours before the deadline awards bonus points.
                  </li>
                  <li>
                    <strong className="text-foreground">Fault Scanning (+2 pts):</strong> Running AI fault scans and reporting lab component issues grants bonus points.
                  </li>
                  <li>
                    <strong className="text-foreground">Late Return Penalty (-6 pts/day):</strong> Overdue equipment reduces trust score.
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-muted/20 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
