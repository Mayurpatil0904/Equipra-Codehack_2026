// frontend/src/components/EquipmentReportModal.tsx
//
// "Bank statement" style report: admin picks a from/to date range
// and downloads every equipment transaction (issued/returned) in
// that window, including return condition, as Excel or CSV.

import { useState } from "react";
import { X, Download, Loader2, Calendar, FileSpreadsheet, FileText } from "lucide-react";
import { adminApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function EquipmentReportModal({ onClose }: Props) {
  const [from, setFrom]     = useState(daysAgoStr(30));
  const [to, setTo]         = useState(todayStr());
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [busy, setBusy]     = useState(false);

  const quickRanges = [
    { label: "Last 7 days",  days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
  ];

  const handleDownload = async () => {
    if (!from || !to) { toast.error("Pick both a start and end date."); return; }
    if (from > to) { toast.error("Start date must be before end date."); return; }
    setBusy(true);
    try {
      await adminApi.downloadEquipmentReport({ from, to, format });
      toast.success("Report downloaded.");
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md p-6 animate-fade-in">

        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display text-lg font-bold">Equipment Transaction Report</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Download a statement of every item issued or returned in a date range, with condition on return.
            </p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        {/* Quick ranges */}
        <div className="flex gap-2 mb-4">
          {quickRanges.map(r => (
            <button key={r.days} onClick={() => { setFrom(daysAgoStr(r.days)); setTo(todayStr()); }}
              className="flex-1 text-xs font-medium px-2 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary">
              {r.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              From
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              To
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input type="date" value={to} min={from} max={todayStr()} onChange={e => setTo(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </div>
        </div>

        {/* Format */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setFormat("xlsx")}
              className={cn("flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all",
                format === "xlsx" ? "border-primary bg-primary/8 text-primary" : "border-border text-muted-foreground hover:border-primary/30")}>
              <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
            </button>
            <button onClick={() => setFormat("csv")}
              className={cn("flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all",
                format === "csv" ? "border-primary bg-primary/8 text-primary" : "border-border text-muted-foreground hover:border-primary/30")}>
              <FileText className="h-4 w-4" /> CSV
            </button>
          </div>
        </div>

        <button onClick={handleDownload} disabled={busy}
          className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Generating…</> : <><Download className="h-4 w-4" />Download Report</>}
        </button>

        <p className="text-[10px] text-muted-foreground text-center mt-3">
          Includes request code, equipment, student, dates issued/returned, status, and return condition for every transaction in range.
        </p>
      </div>
    </div>
  );
}
