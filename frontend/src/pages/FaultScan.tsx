import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, CheckCircle2, AlertTriangle, Clock, ShieldCheck, Loader2, History } from "lucide-react";
import { faultScanApi, equipmentApi } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getEquipmentIcon } from "@/lib/equipmentIcons";

interface ScanRecord {
  equipmentName: string;
  slug:          string;
  result:        string;
  time:          string;
  ok:            boolean;
}

const dotCls: Record<string, string> = {
  success: "bg-status-available",
  pending: "bg-status-pending",
  warning: "bg-status-issued",
  error:   "bg-status-fault",
};

export default function FaultScan() {
  const { role } = useApp();
  const [searchParams] = useSearchParams();
  const [query,     setQuery]     = useState(searchParams.get("id") ?? "");
  const [scanning,  setScanning]  = useState(false);
  const [result,    setResult]    = useState<any>(null);
  const [notFound,  setNotFound]  = useState(false);
  const [history,   setHistory]   = useState<ScanRecord[]>([]);
  const [scanResult,setScanResult]= useState<"ok"|"fault">("ok");
  const [notes,     setNotes]     = useState("");
  const [submitting,setSubmitting]= useState(false);

  // Load recent scans from backend
  useEffect(() => {
    faultScanApi.list()
      .then(scans => {
        setHistory(scans.slice(0, 10).map((s: any) => ({
          equipmentName: s.equipment?.name ?? "Unknown",
          slug:          s.equipment?.slug ?? "",
          result:        s.result,
          time:          new Date(s.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          ok:            s.result === "ok",
        })));
      })
      .catch(() => {}); // silently fail if no scans yet
  }, []);

  const lookupEquipment = async () => {
    const q = query.trim();
    if (!q) return;
    setScanning(true);
    setResult(null);
    setNotFound(false);
    try {
      // ✅ Try the human-readable Equipment ID lookup first — this is the
      // only endpoint that returns the FULL (unlimited) timeline history.
      const item = await equipmentApi.lookupByEquipmentId(q);
      setResult(item);
    } catch {
      try {
        // Fallback: try as a slug (returns only latest 5 timeline entries)
        const item = await equipmentApi.get(q.toLowerCase());
        setResult(item);
      } catch {
        // Final fallback: search local seed data
        const { hardwareData } = await import("@/data/hardwareData");
        const ql = q.toLowerCase();
        const local = hardwareData.find(h =>
          h.id.toLowerCase() === ql || h.name.toLowerCase().includes(ql)
        );
        if (local) {
          setResult(local);
        } else {
          setNotFound(true);
        }
      }
    } finally {
      setScanning(false);
    }
  };

  // Auto-run lookup if an Equipment ID was passed via ?id= (from Inventory page link)
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam) {
      // small delay to ensure state is settled
      setQuery(idParam);
      equipmentApi.lookupByEquipmentId(idParam)
        .then(setResult)
        .catch(() => setNotFound(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitScan = async () => {
    if (!result) { toast.error("Please look up equipment first."); return; }
    if (role !== "admin") { toast.error("Only lab assistants can record scans."); return; }
    setSubmitting(true);
    try {
      const slug = result.slug ?? result.id;
      const scan = await faultScanApi.create({ equipmentSlug: slug, result: scanResult, notes });
      toast.success(scanResult === "ok" ? "✅ Scan recorded — No fault detected." : "⚠️ Fault recorded and equipment status updated.");
      const newRecord: ScanRecord = {
        equipmentName: result.name,
        slug,
        result: scanResult,
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        ok: scanResult === "ok",
      };
      setHistory(prev => [newRecord, ...prev.slice(0, 9)]);
      setNotes("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to record scan.");
    } finally {
      setSubmitting(false);
    }
  };

  const scanStatuses = [
    { status: "scanned_ok_before" as const, title: "Scanned Before Issue — OK",  desc: "Hardware inspected and verified before being handed to student." },
    { status: "scanned_ok_after"  as const, title: "Scanned After Return — OK",   desc: "Hardware confirmed in same condition after return." },
    { status: "fault_detected"    as const, title: "Fault Detected After Return", desc: "Issue identified during post-return inspection. Logged for review." },
    { status: "fault_evaluation"  as const, title: "Fault Under Evaluation",      desc: "Lab staff investigating reported or detected issue." },
    { status: "not_scanned"       as const, title: "Not Yet Scanned",             desc: "Hardware pending inspection." },
  ];

  const ResultIcon = getEquipmentIcon(result?.category);

  return (
    <>
      <section className="bg-muted/30 border-b border-border py-12">
        <div className="container max-w-3xl">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Fault Detection & Condition Verification</h1>
          <p className="text-muted-foreground leading-relaxed">
            Pre-issue and post-return scans create a transparent record protecting students and the department.
          </p>
        </div>
      </section>

      <div className="container py-10 max-w-3xl space-y-6">

        {/* Why it matters */}
        <div className="flex items-start gap-4 p-5 bg-primary/8 border border-primary/20 rounded-xl">
          <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-foreground mb-1">Why Condition Verification Matters</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pre-issue and post-return scans ensure fair accountability. Any fault found after return that wasn't present before issue is flagged automatically.
            </p>
          </div>
        </div>

        {/* Scanner card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="scan-ring mb-6">🔍</div>
          <h3 className="font-semibold text-foreground text-center mb-2">Equipment Lookup</h3>
          <p className="text-sm text-muted-foreground text-center mb-5">
            Enter the Equipment ID (e.g. <code className="font-mono text-primary bg-primary/8 px-1.5 py-0.5 rounded text-xs">EQ-0001</code>) to view its full usage history, or search by name/slug.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && lookupEquipment()}
                placeholder="e.g. EQ-0001 or equipment name…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <button onClick={lookupEquipment} disabled={scanning}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2 transition-colors">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Lookup
            </button>
          </div>

          {/* Lookup result */}
          {result && (
            <div className="animate-fade-in">
              <div className={cn("p-4 rounded-xl border mb-4 text-sm",
                result.availabilityStatus === "maintenance" || result.faultScanStatus === "fault_detected"
                  ? "bg-status-fault/10 border-status-fault/30"
                  : "bg-status-available/10 border-status-available/30")}>
                <div className="flex items-center gap-2 mb-2">
                  <ResultIcon className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">{result.name}</span>
                  {result.equipmentId && (
                    <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {result.equipmentId}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {result.availabilityStatus && <StatusBadge type="availability" status={result.availabilityStatus} />}
                  {result.faultScanStatus    && <StatusBadge type="fault"        status={result.faultScanStatus} />}
                </div>
                <p className="text-xs text-muted-foreground">📍 {result.labLocation} · Supervisor: {result.supervisorName ?? result.supervisor}</p>
              </div>

              {/* ✅ Full usage timeline history — unlimited, unlike Inventory's latest-5 */}
              {Array.isArray(result.timeline) && result.timeline.length > 0 && (
                <div className="bg-muted/30 border border-border rounded-xl p-4 mb-4">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <History className="h-4 w-4 text-primary" />
                    Usage Timeline ({result.timeline.length} {result.timeline.length === 1 ? "entry" : "entries"})
                  </p>
                  <div className="space-y-0 max-h-80 overflow-y-auto pr-1">
                    {result.timeline.map((entry: any, i: number) => (
                      <div key={entry.id ?? i} className="flex gap-3 pb-3 last:pb-0 relative">
                        {i < result.timeline.length - 1 && (
                          <div className="absolute left-[5px] top-5 w-0.5 h-full bg-border" />
                        )}
                        <div className={cn("w-[11px] h-[11px] rounded-full flex-shrink-0 mt-1 z-10", dotCls[entry.status] ?? "bg-muted")} />
                        <div>
                          <p className="text-sm text-foreground">{entry.description}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {entry.date ?? new Date(entry.createdAt).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin scan form */}
              {role === "admin" && (
                <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Record Scan Result</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(["ok","fault"] as const).map(r => (
                      <button key={r} onClick={() => setScanResult(r)}
                        className={cn("py-2.5 rounded-xl border-2 text-sm font-semibold transition-all",
                          scanResult === r
                            ? r === "ok"
                              ? "border-status-available bg-status-available/10 text-status-available"
                              : "border-status-fault bg-status-fault/10 text-status-fault"
                            : "border-border text-muted-foreground hover:border-border/60")}>
                        {r === "ok" ? "✅ No Fault" : "⚠️ Fault Detected"}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes (optional)</label>
                    <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="e.g. Minor scratch on casing, all connectors intact"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  </div>
                  <button onClick={submitScan} disabled={submitting}
                    className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Recording…</> : "Record Scan"}
                  </button>
                </div>
              )}
            </div>
          )}

          {notFound && (
            <div className="p-3 rounded-xl bg-muted border border-border text-sm text-muted-foreground animate-fade-in">
              ❌ Equipment not found. Check the ID and try again.
            </div>
          )}
        </div>

        {/* Scan history */}
        {history.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3">Recent Scans</h3>
            <div className="divide-y divide-border">
              {history.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-foreground">{s.equipmentName}</span>
                  <div className="flex items-center gap-3">
                    <span className={cn("font-semibold text-xs", s.ok ? "text-status-available" : "text-status-fault")}>
                      {s.ok ? "✅ OK" : "⚠️ Fault"}
                    </span>
                    <span className="text-muted-foreground text-xs font-mono">{s.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status guide */}
        <h2 className="font-display text-xl font-bold text-foreground">Fault Scan Status Guide</h2>
        <div className="space-y-3">
          {scanStatuses.map(item => (
            <div key={item.status} className="bg-card border border-border rounded-xl p-4 animate-fade-in">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <h3 className="font-medium text-foreground">{item.title}</h3>
                <StatusBadge type="fault" status={item.status} />
              </div>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground italic pb-4">
          "This platform does not assign financial responsibility. All decisions remain under university and departmental policy."
        </p>
      </div>
    </>
  );
}
