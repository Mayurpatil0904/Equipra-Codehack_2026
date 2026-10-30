import { useState } from "react";
import { X, Loader2, Star } from "lucide-react";
import { requestsApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CONDITIONS = [
  { rating: 5, label: "Excellent", desc: "Perfect working condition", emoji: "✨" },
  { rating: 4, label: "Good",      desc: "Minor cosmetic wear only", emoji: "👍" },
  { rating: 3, label: "Fair",      desc: "Needs inspection before reuse", emoji: "⚠️" },
  { rating: 2, label: "Damaged",   desc: "Visible damage, needs repair", emoji: "🔧" },
  { rating: 1, label: "Faulty",    desc: "Not working, requires service", emoji: "❌" },
];

const OUTCOMES: Record<number, { status: string; color: string }> = {
  5: { status: "→ Available immediately", color: "text-status-available" },
  4: { status: "→ Available immediately", color: "text-status-available" },
  3: { status: "→ Inspection hold (24h review)", color: "text-status-pending" },
  2: { status: "→ Sent to maintenance", color: "text-status-maintenance" },
  1: { status: "→ Maintenance + fault flagged", color: "text-status-fault" },
};

interface Props {
  request: { id: string; requestCode?: string; equipment?: { name?: string }; student?: { name?: string } };
  onClose: () => void;
  onDone?: () => void;
}

export function ReturnInspectionModal({ request, onClose, onDone }: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [damageNotes, setDamageNotes] = useState("");
  const [damagePercent, setDamagePercent] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (rating === 0) { toast.error("Please select a condition rating."); return; }
    setBusy(true);
    try {
      await requestsApi.markReturned(request.id, {
        conditionRating: rating,
        ...(damageNotes && { damageNotes }),
        ...(rating <= 3 && { damagePercent }),
      });
      toast.success("Return processed successfully!");
      onDone?.();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to process return.");
    } finally {
      setBusy(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Return Inspection</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {request.equipment?.name ?? "Equipment"} — {request.requestCode ?? request.id.slice(0, 8)}
            </p>
            {request.student?.name && (
              <p className="text-xs text-muted-foreground mt-0.5">Student: {request.student.name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Star Rating */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Equipment Condition *
          </label>
          <div className="flex gap-1 mb-3 justify-center">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(i)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    i <= activeRating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  )}
                />
              </button>
            ))}
          </div>

          {/* Condition options */}
          <div className="space-y-2">
            {CONDITIONS.map(c => (
              <button
                key={c.rating}
                type="button"
                onClick={() => setRating(c.rating)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all text-sm",
                  rating === c.rating
                    ? "border-primary bg-primary/8 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/30 hover:bg-muted/50"
                )}
              >
                <span className="text-xl">{c.emoji}</span>
                <div className="flex-1">
                  <span className="font-semibold">{c.label}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{c.desc}</span>
                </div>
                {rating === c.rating && (
                  <span className={cn("text-xs font-medium", OUTCOMES[c.rating].color)}>
                    {OUTCOMES[c.rating].status}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Damage details - only show for rating <= 3 */}
        {rating > 0 && rating <= 3 && (
          <div className="space-y-4 mb-5 p-4 bg-muted/30 rounded-xl border border-border animate-fade-in">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Damage Description
              </label>
              <textarea
                value={damageNotes}
                onChange={e => setDamageNotes(e.target.value)}
                placeholder="Describe the damage or issue..."
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Estimated Damage: {damagePercent}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={damagePercent}
                onChange={e => setDamagePercent(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0% (cosmetic)</span>
                <span>100% (total)</span>
              </div>
            </div>
          </div>
        )}

        {/* Outcome preview */}
        {rating > 0 && (
          <div className={cn("text-sm font-medium mb-4 p-3 rounded-lg border", 
            rating >= 4 ? "bg-status-available/5 border-status-available/20 text-status-available" :
            rating === 3 ? "bg-status-pending/5 border-status-pending/20 text-status-pending" :
            "bg-status-fault/5 border-status-fault/20 text-status-fault"
          )}>
            Outcome: {OUTCOMES[rating].status}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || rating === 0}
            className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
          >
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Processing…</> : "Complete Return"}
          </button>
        </div>
      </div>
    </div>
  );
}
