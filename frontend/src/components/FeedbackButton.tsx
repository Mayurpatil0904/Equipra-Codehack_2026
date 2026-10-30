import { useState } from "react";
import { MessageSquarePlus, X, Star } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { feedbackApi } from "@/lib/api";
import { toast } from "sonner";

export function FeedbackButton() {
  const { role } = useApp();
  const [open,   setOpen]   = useState(false);
  const [dept,   setDept]   = useState("Electronics & Communication");
  const [type,   setType]   = useState("New Equipment Request");
  const [message,setMessage]= useState("");
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);

  if (!role) return null;

  const handleSubmit = async () => {
    if (!message.trim()) { toast.error("Please enter your feedback."); return; }
    setSaving(true);
    try {
      await feedbackApi.submit({ department: dept, type, message: message.trim(), rating });
      toast.success("Feedback submitted to " + dept + " department!");
      setOpen(false); setMessage(""); setRating(0);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit feedback.");
    } finally { setSaving(false); }
  };

  return (
    <>
      <button
        className="feedback-float"
        onClick={() => setOpen(true)}>
        <MessageSquarePlus className="h-4 w-4" />
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">Send Feedback</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Suggest equipment or improvements to your department</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Department</label>
                <select value={dept} onChange={e => setDept(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  {["Electronics & Communication","Computer Science","Mechanical","Civil","Instrumentation","Information Technology"].map(d => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Feedback Type</label>
                <select value={type} onChange={e => setType(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  {["New Equipment Request","Maintenance Report","Process Improvement","Other"].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Your Suggestion</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
                  placeholder="Describe your suggestion in detail..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Rating (Optional)</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setRating(n)} className="transition-colors">
                      <Star className="h-7 w-7" fill={n <= rating ? "#f0a500" : "none"} stroke={n <= rating ? "#f0a500" : "currentColor"} />
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleSubmit} disabled={saving}
                className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
                {saving ? "Submitting…" : "Submit Feedback"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
