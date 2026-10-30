import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Package, FileText, Calendar, CheckCircle2, AlertTriangle, Users, User, Loader2, Zap, Flame, ShieldCheck, Sparkles, Building2, Clock } from "lucide-react";
import { hardwareData } from "@/data/hardwareData";
import { useApp } from "@/context/AppContext";
import { professorsApi, equipmentApi, trustScoreApi } from "@/lib/api";
import { daysBetween, todayStr, addDays, cn } from "@/lib/utils";
import { toast } from "sonner";

type ReqType = "individual" | "team";

export default function RequestIssue() {
  const { user, teams, addRequest } = useApp();
  const navigate = useNavigate();
  const [params]  = useSearchParams();

  const [itemId,       setItemId]       = useState(params.get("item") ?? "");
  const [reqType,      setReqType]      = useState<ReqType>("individual");
  const [teamCode,     setTeamCode]     = useState("");
  const [project,      setProject]      = useState("");
  const [description,  setDescription]  = useState("");
  const [profId,       setProfId]       = useState("");
  const [purpose,      setPurpose]      = useState("");
  const [dateFrom,     setDateFrom]     = useState(addDays(todayStr(), 1));
  const [dateTo,       setDateTo]       = useState(addDays(todayStr(), 8));
  const [submitting,   setSubmitting]   = useState(false);
  const [professors,   setProfessors]   = useState<{ id: string; name: string; department: string }[]>([]);
  const [loadingProfs, setLoadingProfs] = useState(true);
  const [allEquipment, setAllEquipment] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [usePriorityPass, setUsePriorityPass] = useState(false);
  const [trustData, setTrustData] = useState<any>(null);

  const myActiveTeam = teams.find(t => t.active && t.members.some(m => m.id === user?.id));
  const days         = dateFrom && dateTo ? daysBetween(dateFrom, dateTo) : 0;
  const datesValid   = days >= 1 && days <= 14;

  // Fetch Trust Score for Priority Pass eligibility
  useEffect(() => {
    trustScoreApi.getMine().then(setTrustData).catch(() => {});
  }, []);

  // Fetch all equipment from backend
  useEffect(() => {
    equipmentApi.list().then(setAllEquipment).catch(() => {});
  }, []);

  // When equipment list loads or itemId changes, find selected item
  useEffect(() => {
    if (itemId && allEquipment.length > 0) {
      const found = allEquipment.find((h: any) => (h.slug ?? h.id) === itemId);
      setSelectedItem(found ?? null);
    } else {
      setSelectedItem(null);
    }
  }, [itemId, allEquipment]);

  // Fetch professors from backend
  useEffect(() => {
    professorsApi.list()
      .then(setProfessors)
      .catch(() => {})
      .finally(() => setLoadingProfs(false));
  }, []);

  // Auto-fill team code
  useEffect(() => {
    if (reqType === "team" && myActiveTeam) setTeamCode(myActiveTeam.id);
  }, [reqType, myActiveTeam]);

  const handleSubmit = async () => {
    if (!itemId)            { toast.error("Please select an equipment item."); return; }
    if (!project.trim())    { toast.error("Please enter a project title."); return; }
    if (!description.trim()){ toast.error("Please enter a project description."); return; }
    if (!profId)            { toast.error("Please select a professor."); return; }
    if (!purpose.trim())    { toast.error("Please enter a purpose / justification."); return; }
    if (!datesValid)        { toast.error("Borrowing period must be 1–14 days."); return; }
    if (reqType === "team" && !teamCode.trim()) { toast.error("Please enter your Team ID."); return; }

    setSubmitting(true);
    try {
      await addRequest({
        equipmentSlug: itemId,
        project:       project.trim(),
        description:   description.trim(),
        purpose:       purpose.trim(),
        professorId:   profId,
        dateFrom,
        dateTo,
        type:          reqType,
        usePriorityPass,
        ...(reqType === "team" ? { teamCode: teamCode.trim() } : {}),
      });
      toast.success(
        usePriorityPass
          ? "⚡ Fast-Track Request submitted! (15 Trust Points spent for urgent queue priority)"
          : "Request submitted! Forwarded to professor for verification."
      );
      navigate("/my-requests");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { label: "Submit",        done: true,  active: false },
    { label: "Faculty",       done: false, active: true  },
    { label: "Lab Assistant", done: false, active: false },
    { label: "Approval",      done: false, active: false },
  ];

  return (
    <>
      <section className="bg-muted/30 border-b border-border py-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="container">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Request Equipment</h1>
            <p className="text-muted-foreground">Your request routes: <strong className="text-foreground">You → Faculty → Lab Assistant → Approved</strong></p>
            <div className="flex items-center gap-0 mt-6 max-w-lg">
              {steps.map((s, i) => (
                <div key={s.label} className="flex items-center gap-0">
                  <div className={cn("workflow-step", s.done && "done", s.active && "active")}>
                    <div className="workflow-step-circle">{s.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}</div>
                    <span className="hidden sm:inline whitespace-nowrap">{s.label}</span>
                  </div>
                  {i < steps.length - 1 && <div className={cn("workflow-step-line", s.done && "done")} />}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <div className="container py-8 max-w-2xl">

        {/* Team lock notice */}
        {myActiveTeam && (
          <div className="mb-6 p-4 bg-status-pending/10 border border-status-pending/30 rounded-xl text-sm text-status-pending flex items-start gap-3">
            <Users className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>You are part of active team <strong>{myActiveTeam.id}</strong> ({myActiveTeam.name}). Individual ID is locked. Use Team ID for all requests while this project is active.</div>
          </div>
        )}

        {/* Section 1 — Equipment */}
        <div className="bg-card border border-border rounded-xl p-6 mb-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-5">
            <Package className="h-4 w-4 text-primary" /> Equipment Selection
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Select Equipment *</label>
              <select value={itemId} onChange={e => setItemId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="">— Choose Equipment —</option>
                {allEquipment.map((h: any) => (
                  <option key={h.slug ?? h.id} value={h.slug ?? h.id}>{h.name} — {h.labLocation}</option>
                ))}
              </select>
              {selectedItem && (
                <div className={cn("mt-2 p-3 rounded-lg text-xs flex items-start gap-2",
                  selectedItem.availabilityStatus === "available"
                    ? "bg-status-available/10 border border-status-available/25 text-status-available"
                    : "bg-status-issued/10 border border-status-issued/25 text-status-issued")}>
                  {selectedItem.availabilityStatus === "available"
                    ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    : <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />}
                  <span>
                    {selectedItem.availabilityStatus === "available"
                      ? `${selectedItem.name} is available at ${selectedItem.labLocation}`
                      : `${selectedItem.name} is currently ${selectedItem.availabilityStatus}. You may still submit for future dates.`}
                  </span>
                </div>
              )}
            </div>

            {/* Request type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Request Type</label>
              <div className="grid grid-cols-2 gap-3">
                {(["individual","team"] as ReqType[]).map(t => (
                  <button key={t} onClick={() => setReqType(t)}
                    className={cn("flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all",
                      reqType === t ? "border-primary bg-primary/8 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40")}>
                    {t === "individual" ? <User className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                    <span className="text-sm font-semibold capitalize">{t}</span>
                  </button>
                ))}
              </div>
            </div>

            {reqType === "team" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Team ID *</label>
                <input type="text" value={teamCode} onChange={e => setTeamCode(e.target.value)}
                  placeholder="e.g. TEAM-PU-0042"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <p className="text-xs text-muted-foreground mt-1">Your team ID was provided by your professor when the project was created.</p>
              </div>
            )}
          </div>
        </div>

        {/* Section 2 — Project Details */}
        <div className="bg-card border border-border rounded-xl p-6 mb-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-5">
            <FileText className="h-4 w-4 text-primary" /> Project Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Project Title *</label>
              <input type="text" value={project} onChange={e => setProject(e.target.value)}
                placeholder="e.g. Smart Home Automation System"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Project Description *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Describe how you will use this equipment in your project..."
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/40" />
              <p className="text-right text-xs text-muted-foreground mt-1">{description.length}/300</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Forward to Professor *</label>
              {loadingProfs ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading professors…
                </div>
              ) : (
                <select value={profId} onChange={e => setProfId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">— Select Professor —</option>
                  {professors.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.department})</option>
                  ))}
                </select>
              )}
              <p className="text-xs text-muted-foreground mt-1">Request will be sent to this professor first for verification before going to the lab assistant.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Purpose / Justification *</label>
              <textarea value={purpose} onChange={e => setPurpose(e.target.value)} rows={2}
                placeholder="Why do you need this specific equipment for your project?"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </div>
        </div>

        {/* Section 3 — Dates */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-5">
            <Calendar className="h-4 w-4 text-primary" /> Borrowing Period
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">From Date *</label>
              <input type="date" value={dateFrom} min={todayStr()} onChange={e => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">To Date *</label>
              <input type="date" value={dateTo} min={dateFrom || todayStr()} onChange={e => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </div>
          {dateFrom && dateTo && (
            days > 14 || days < 1 ? (
              <div className="p-3 bg-status-fault/10 border border-status-fault/25 rounded-lg text-xs text-status-fault flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" /> Max is 14 days. Currently: {days} day{days !== 1 ? "s" : ""}.
              </div>
            ) : (
              <div className="p-3 bg-status-available/10 border border-status-available/25 rounded-lg text-xs text-status-available flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" /> Duration: {days} day{days !== 1 ? "s" : ""} — within the 14-day limit.
              </div>
            )
          )}
        </div>

        {/* Section 4 — Urgent Priority Fast-Track Pass (Burn 15 Points) */}
        {user?.role === "student" && trustData && (
          <div
            className={cn(
              "border rounded-xl p-5 mb-6 transition-all",
              usePriorityPass
                ? "bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-amber-500/40 shadow-sm"
                : trustData.score >= 60
                ? "bg-card border-border hover:border-amber-500/30"
                : "bg-muted/30 border-border opacity-70"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                    usePriorityPass
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                      : trustData.score >= 60
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {usePriorityPass ? <Flame className="h-5 w-5 animate-pulse" /> : <Zap className="h-5 w-5" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      Urgent Priority Fast-Track Pass
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      15 Points Burn
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Have an urgent hackathon or deadline? Spend 15 Trust Points to place this request at the very top of the faculty and lab review queue.
                  </p>

                  {trustData.score >= 60 ? (
                    <div className="flex items-center gap-3 pt-1 text-xs">
                      <span className="text-muted-foreground">
                        Current Score: <strong className="text-foreground">{trustData.score}</strong>
                      </span>
                      {usePriorityPass && (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                          ➔ New Score: <strong>{trustData.score - 15}</strong> (recovers on on-time return)
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-rose-500 font-medium pt-1">
                      🔒 Locked: Requires minimum 60 Trust Score (Your score: {trustData.score}/100)
                    </p>
                  )}
                </div>
              </div>

              {trustData.score >= 60 && (
                <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={usePriorityPass}
                    onChange={(e) => setUsePriorityPass(e.target.checked)}
                    className="h-5 w-5 accent-amber-500 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-foreground hidden sm:inline">
                    {usePriorityPass ? "Fast-Track Enabled" : "Use Fast-Track"}
                  </span>
                </label>
              )}
            </div>
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
          {submitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</>
          ) : usePriorityPass ? (
            <><Zap className="h-4 w-4 fill-amber-300 text-amber-300" /> Submit with Priority Fast-Track →</>
          ) : (
            "Submit Request for Approval →"
          )}
        </button>
      </div>
    </>
  );
}
