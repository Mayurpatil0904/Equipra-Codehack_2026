import { useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { StatusBadge } from "@/components/StatusBadge";
import { TrustScoreBadge } from "@/components/TrustScoreBadge";
import { TrustScoreModal } from "@/components/TrustScoreModal";
import { requestsApi } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import TeamsPage from "./Teams";

type Tab = "pending" | "teams" | "history";

export default function FacultyDashboard() {
  const { requests, fetchRequests, user } = useApp();
  const [tab,               setTab]               = useState<Tab>("pending");
  const [actingOn,          setActingOn]          = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Faculty sees requests assigned to them by their DB id
  const myRequests = requests.filter(r => r.professorId === user?.id || r.professorId === "prof_patel");
  const pending    = myRequests.filter(r => r.status === "pending_faculty");
  const history    = myRequests.filter(r => r.status !== "pending_faculty");

  const approve = async (id: string) => {
    setActingOn(id);
    try {
      await requestsApi.facultyDecision(id, true);
      await fetchRequests();
      toast.success("✅ Request verified and forwarded to Lab Assistant!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to approve.");
    } finally { setActingOn(null); }
  };

  const reject = async (id: string) => {
    setActingOn(id);
    try {
      await requestsApi.facultyDecision(id, false);
      await fetchRequests();
      toast.success("Request rejected. Student has been notified.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to reject.");
    } finally { setActingOn(null); }
  };

  const TABS = [
    { id: "pending" as Tab, label: `📋 Pending (${pending.length})` },
    { id: "teams"   as Tab, label: "👥 My Teams" },
    { id: "history" as Tab, label: "📂 History" },
  ];

  return (
    <>
      <section className="bg-muted/30 border-b border-border py-10">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Faculty Dashboard</h1>
            <p className="text-muted-foreground">Review and verify student equipment requests. Approved requests are forwarded to the lab assistant.</p>
          </motion.div>
        </div>
      </section>

      <div className="container py-6">
        <div className="flex gap-1 bg-muted/50 border border-border rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn("flex-1 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200",
                tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "pending" && (
          pending.length === 0
            ? <div className="text-center py-20 text-muted-foreground"><div className="text-4xl mb-3">✅</div><p>No pending requests to review.</p></div>
            : <div className="space-y-4">
                {pending.map(req => (
                  <div
                    key={req.id}
                    className={cn(
                      "bg-card border rounded-xl p-5 animate-fade-in transition-all",
                      req.isPriorityPassUsed
                        ? "border-amber-500/50 bg-gradient-to-r from-amber-500/5 via-card to-card shadow-sm"
                        : "border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{req.itemName}</h3>
                          {req.isPriorityPassUsed && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              ⚡ Urgent Fast-Track ({req.pointsBurned || 15} pts spent)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{req.id}</p>
                      </div>
                      <StatusBadge type="request" status={req.status} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-muted-foreground">Student:</span>
                        <span className="font-medium text-foreground">{req.studentName}</span>
                        <span className="text-xs text-muted-foreground font-mono">({req.studentId})</span>
                        {req.studentTrust && (
                          <TrustScoreBadge
                            score={req.studentTrust.score}
                            tier={req.studentTrust.tier}
                            size="sm"
                            onClick={() => setSelectedStudentId(req.studentId)}
                          />
                        )}
                      </div>
                      <div><span className="text-muted-foreground">Type:</span> {req.type === "team" ? <span className="team-id-badge text-[10px] py-0.5 px-2">{req.teamId}</span> : <span className="font-medium text-foreground">Individual</span>}</div>
                      <div><span className="text-muted-foreground">Project:</span> <span className="font-medium text-foreground">{req.project}</span></div>
                      <div><span className="text-muted-foreground">Dates:</span> <span className="font-medium text-foreground">{formatDate(req.dateFrom)} → {formatDate(req.dateTo)}</span></div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 mb-4 text-sm"><span className="font-medium text-foreground">Purpose: </span><span className="text-muted-foreground">{req.purpose}</span></div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button onClick={() => approve(req.id)} disabled={actingOn === req.id}
                        className="flex-1 bg-status-available/10 text-status-available border border-status-available/30 rounded-xl py-2.5 text-sm font-semibold hover:bg-status-available hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {actingOn === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "✓"} Verify & Forward to Lab
                      </button>
                      <button onClick={() => reject(req.id)} disabled={actingOn === req.id}
                        className="flex-1 bg-status-fault/10 text-status-fault border border-status-fault/30 rounded-xl py-2.5 text-sm font-semibold hover:bg-status-fault hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {actingOn === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "✗"} Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
        )}

        {tab === "teams" && <TeamsPage />}

        {tab === "history" && (
          history.length === 0
            ? <div className="text-center py-20 text-muted-foreground">No history yet.</div>
            : <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>ID</th><th>Student</th><th>Equipment</th><th>Project</th><th>Type</th><th>Status</th></tr></thead>
                    <tbody>
                      {history.map(r => (
                        <tr key={r.id}>
                          <td className="font-mono text-xs">{r.id}</td>
                          <td>{r.studentName}</td>
                          <td>{r.itemName}</td>
                          <td className="max-w-[180px] truncate">{r.project}</td>
                          <td>{r.type === "team" ? <span className="team-id-badge text-[10px] py-0.5 px-2">{r.teamId}</span> : <span className="text-xs text-muted-foreground">Individual</span>}</td>
                          <td><StatusBadge type="request" status={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
        )}
      </div>

      {selectedStudentId && (
        <TrustScoreModal
          userId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}
    </>
  );
}
