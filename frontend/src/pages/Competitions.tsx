// frontend/src/pages/Competitions.tsx
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Trophy, Plus, Loader2, Calendar, Globe, Users, ChevronRight,
  ExternalLink, FileText, Video, Image, Send, X, Clock, Check,
  XCircle, AlertTriangle, Sparkles, MapPin, Award, Tag,
} from "lucide-react";
import { competitionsApi, projectsApi, aiApi } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GenerateButton } from "@/components/effects/GenerateButton";
import { TeamMatchmakingBoard } from "@/components/matchmaking/TeamMatchmakingBoard";

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT:     { bg: "bg-slate-500/10",   text: "text-slate-500",   label: "Draft" },
  SUBMITTED: { bg: "bg-blue-500/10",    text: "text-blue-500",    label: "Submitted" },
  ACCEPTED:  { bg: "bg-emerald-500/10", text: "text-emerald-500", label: "Accepted" },
  REJECTED:  { bg: "bg-red-500/10",     text: "text-red-500",     label: "Rejected" },
};

// ── Create Competition Modal (admin) ──────────────────────────
function CreateCompModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState({ name: "", organizer: "", deadline: "", description: "", website: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.name.trim()) { toast.error("Name is required."); return; }
    setBusy(true);
    try { await competitionsApi.create(f); toast.success("Competition created!"); onCreated(); onClose(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm glass-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-lg font-bold mb-4">New Competition</h2>
        <div className="space-y-3">
          {[
            { k: "name", l: "Competition Name *", ph: "e.g. SIH 2025, IEEE Expo" },
            { k: "organizer", l: "Organizer", ph: "e.g. AICTE, IEEE" },
            { k: "description", l: "Description", ph: "Brief description" },
            { k: "website", l: "Website URL", ph: "https://..." },
          ].map(({ k, l, ph }) => (
            <div key={k}>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{l}</label>
              {k === "description" ? (
                <textarea value={(f as any)[k]} onChange={e => set(k, e.target.value)} placeholder={ph} rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />
              ) : (
                <input value={(f as any)[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              )}
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Deadline</label>
            <input type="date" value={f.deadline} onChange={e => set("deadline", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted">Cancel</button>
          <button onClick={submit} disabled={busy}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Submit Entry Modal ────────────────────────────────────────
function SubmitEntryModal({ compId, compName, onClose, onSubmitted }: { compId: string; compName: string; onClose: () => void; onSubmitted: () => void }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [links, setLinks] = useState({ proposal: "", presentation: "", report: "", video: "", poster: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsApi.list().then(setProjects).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!selectedProject) { toast.error("Select a project."); return; }
    setBusy(true);
    try {
      await competitionsApi.submitEntry(compId, { projectId: selectedProject, ...links });
      toast.success("Entry submitted!");
      onSubmitted();
      onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm glass-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-lg font-bold mb-1">Submit Entry</h2>
        <p className="text-sm text-muted-foreground mb-4">to <span className="font-medium text-foreground">{compName}</span></p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Select Project *</label>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2"><Loader2 className="h-4 w-4 animate-spin" />Loading projects…</div>
            ) : (
              <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="">Choose a project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.name}</option>)}
              </select>
            )}
          </div>

          <p className="text-xs text-muted-foreground">Attach links to your submission materials (all optional):</p>
          {[
            { k: "proposal", l: "Proposal / Abstract", icon: FileText },
            { k: "presentation", l: "Presentation (PPT)", icon: FileText },
            { k: "report", l: "Report / Paper", icon: FileText },
            { k: "video", l: "Demo Video", icon: Video },
            { k: "poster", l: "Poster", icon: Image },
          ].map(({ k, l, icon: Icon }) => (
            <div key={k}>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                <Icon className="h-3 w-3" />{l}
              </label>
              <input value={(links as any)[k]} onChange={e => setLinks(p => ({ ...p, [k]: e.target.value }))}
                placeholder="https://..." className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes</label>
            <textarea value={links.notes} onChange={e => setLinks(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Any additional notes…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted">Cancel</button>
          <button onClick={submit} disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5" />Submit Entry</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Competition Detail View ───────────────────────────────────
function CompetitionDetail({ comp, onBack, onRefresh, isAdmin }: { comp: any; onBack: () => void; onRefresh: () => void; isAdmin: boolean }) {
  const [showSubmit, setShowSubmit] = useState(false);

  const handleStatusChange = async (entryId: string, status: string) => {
    try {
      await competitionsApi.updateEntry(entryId, { status });
      toast.success(`Entry ${status.toLowerCase()}.`);
      onRefresh();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      {showSubmit && <SubmitEntryModal compId={comp.id} compName={comp.name} onClose={() => setShowSubmit(false)} onSubmitted={onRefresh} />}

      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1 transition-colors">
        ← All Competitions
      </button>

      <div className="bg-card border border-border rounded-xl p-6 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">{comp.name}</h2>
            {comp.organizer && <p className="text-sm text-muted-foreground mt-0.5">{comp.organizer}</p>}
            {comp.description && <p className="text-sm text-muted-foreground mt-2">{comp.description}</p>}
          </div>
          <button onClick={() => setShowSubmit(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shrink-0">
            <Send className="h-3.5 w-3.5" />Submit Project
          </button>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          {comp.deadline && (
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(comp.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          )}
          {comp.website && (
            <a href={comp.website} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Globe className="h-3 w-3" />Website<ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{comp._count?.entries ?? comp.entries?.length ?? 0} entries</span>
        </div>
      </div>

      <h3 className="font-semibold text-sm mb-3">Submissions ({comp.entries?.length ?? 0})</h3>

      {(!comp.entries || comp.entries.length === 0) ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          <Trophy className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No entries yet. Be the first to submit!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comp.entries.map((entry: any) => {
            const st = STATUS_STYLE[entry.status] ?? STATUS_STYLE.DRAFT;
            return (
              <div key={entry.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{entry.project?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{entry.project?.projectCode} • {entry.project?.department}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">by {entry.submittedBy?.name}</p>
                  </div>
                  <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", st.bg, st.text)}>{st.label}</span>
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {entry.proposal && <a href={entry.proposal} target="_blank" rel="noopener" className="text-[10px] flex items-center gap-1 text-primary hover:underline"><FileText className="h-3 w-3" />Proposal</a>}
                  {entry.presentation && <a href={entry.presentation} target="_blank" rel="noopener" className="text-[10px] flex items-center gap-1 text-primary hover:underline"><FileText className="h-3 w-3" />PPT</a>}
                  {entry.report && <a href={entry.report} target="_blank" rel="noopener" className="text-[10px] flex items-center gap-1 text-primary hover:underline"><FileText className="h-3 w-3" />Report</a>}
                  {entry.video && <a href={entry.video} target="_blank" rel="noopener" className="text-[10px] flex items-center gap-1 text-primary hover:underline"><Video className="h-3 w-3" />Video</a>}
                  {entry.poster && <a href={entry.poster} target="_blank" rel="noopener" className="text-[10px] flex items-center gap-1 text-primary hover:underline"><Image className="h-3 w-3" />Poster</a>}
                </div>

                {entry.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">{entry.notes}</p>}

                {/* Admin actions */}
                {isAdmin && entry.status === "SUBMITTED" && (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
                    <button onClick={() => handleStatusChange(entry.id, "ACCEPTED")}
                      className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-md hover:bg-emerald-500/10 transition-colors">
                      <Check className="h-3 w-3" />Accept
                    </button>
                    <button onClick={() => handleStatusChange(entry.id, "REJECTED")}
                      className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 px-2 py-1 rounded-md hover:bg-red-500/10 transition-colors">
                      <XCircle className="h-3 w-3" />Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

const DEPT_KEYWORDS: Record<string, string[]> = {
  cse: ["coding", "programming", "software", "web", "app", "algorithm", "dev", "code", "hackathon", "open source", "api", "cloud"],
  cs: ["coding", "programming", "software", "web", "algorithm", "dev", "code"],
  it: ["software", "web", "cloud", "devops", "network", "code", "programming", "cyber"],
  aiml: ["ai", "artificial intelligence", "machine learning", "deep learning", "nlp", "neural", "model", "data science", "kaggle", "ml"],
  ece: ["electronics", "embedded", "iot", "circuit", "vlsi", "fpga", "sensor", "arduino", "raspberry", "hardware", "robotics"],
  eee: ["electrical", "power", "energy", "renewable", "automation", "smart grid", "circuit"],
  me: ["mechanical", "cad", "3d printing", "robotics", "manufacturing", "drone", "vehicle", "ev"],
  ce: ["civil", "construction", "structural", "infrastructure", "smart city", "urban"],
  bt: ["biotech", "biology", "genomics", "bioinformatics", "healthcare", "medical"],
};

function getRelevanceScore(comp: any, department?: string): number {
  if (!department) return 0;
  const dept = department.toLowerCase().replace(/[^a-z]/g, "");
  const keywords = DEPT_KEYWORDS[dept] || [];
  if (keywords.length === 0) {
    for (const [key, kws] of Object.entries(DEPT_KEYWORDS)) {
      if (dept.includes(key) || key.includes(dept)) { keywords.push(...kws); break; }
    }
  }
  if (keywords.length === 0) return 0;
  const text = `${comp.name} ${comp.description} ${comp.eligibility} ${comp.category} ${comp.organizer}`.toLowerCase();
  return keywords.filter(kw => text.includes(kw)).length;
}

// ── Main Page ─────────────────────────────────────────────────
export default function Competitions() {
  const { role, user } = useApp();
  const isAdmin = role === "admin";
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"relevance" | "prize" | "deadline" | "team">("relevance");
  const [selectedComp, setSelectedComp] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"competitions" | "matchmaking">("competitions");

  const load = async () => {
    setLoading(true);
    try { setCompetitions(await competitionsApi.list()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const result = await aiApi.discoverCompetitions(user?.department);
      toast.success(result.message || `Found ${result.added} new competitions!`);
      load();
    } catch (e: any) { toast.error(e.message ?? "Discovery failed."); }
    finally { setDiscovering(false); }
  };

  useEffect(() => { load(); }, []);

  const openComp = async (id: string) => {
    setDetailLoading(true);
    try { setSelectedComp(await competitionsApi.get(id)); }
    catch (e: any) { toast.error(e.message); }
    finally { setDetailLoading(false); }
  };

  const refreshDetail = async () => {
    if (!selectedComp) return;
    try { setSelectedComp(await competitionsApi.get(selectedComp.id)); }
    catch {}
  };

  const renderCard = (comp: any, i: number) => {
    const daysLeft = comp.deadline ? Math.ceil((new Date(comp.deadline).getTime() - Date.now()) / 86400000) : null;
    const categoryColors: Record<string, string> = {
      hackathon: "bg-orange-500/10 text-orange-600",
      competition: "bg-blue-500/10 text-blue-600",
      program: "bg-emerald-500/10 text-emerald-600",
      expo: "bg-purple-500/10 text-purple-600",
      workshop: "bg-amber-500/10 text-amber-600",
    };
    
    // Extract registered count from description (e.g. "510 registered.")
    const registeredMatch = comp.description?.match(/(\d[\d,]*)\s*registered/i);
    const registeredCount = registeredMatch ? registeredMatch[1] : null;

    return (
      <motion.div
        key={comp.id}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: i * 0.03 }}
        viewport={{ once: true }}
        className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all group">
        {/* Card Header */}
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                {comp.category && (
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full", categoryColors[comp.category] || "bg-muted text-muted-foreground")}>
                    {comp.category}
                  </span>
                )}
                {comp.source === "ai" && (
                  <span className="text-[10px] font-medium text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded-full ml-1">
                    <Sparkles className="h-2.5 w-2.5 inline mr-0.5" />AI
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => openComp(comp.id)} className="text-muted-foreground hover:text-primary transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h3 className="font-semibold text-sm mb-1 line-clamp-2 cursor-pointer hover:text-primary transition-colors" onClick={() => openComp(comp.id)}>
            {comp.name}
          </h3>
          {comp.organizer && <p className="text-xs text-muted-foreground mb-2">{comp.organizer}</p>}
          {comp.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{comp.description}</p>}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {daysLeft !== null && daysLeft >= 0 && (
              <span className={cn("flex items-center gap-1 font-medium", daysLeft <= 7 ? "text-red-500" : daysLeft <= 14 ? "text-amber-500" : "text-emerald-500")}>
                <Clock className="h-3 w-3" />{daysLeft === 0 ? "Today" : `${daysLeft}d left`}
              </span>
            )}
            {comp.location && (
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{comp.location}</span>
            )}
            {comp.prize && (
              <span className="flex items-center gap-1 text-amber-600 font-medium"><Award className="h-3 w-3" />{comp.prize}</span>
            )}
            {comp._count?.entries > 0 ? (
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{comp._count.entries} entries</span>
            ) : registeredCount ? (
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{registeredCount} registered</span>
            ) : null}
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
          {(comp.regLink || comp.website) && (
            <a href={comp.regLink || comp.website} target="_blank" rel="noopener"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
              <ExternalLink className="h-3 w-3" />Register
            </a>
          )}
          <button onClick={() => openComp(comp.id)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            View Details →
          </button>
        </div>
      </motion.div>
    );
  };

  const { recommended, others } = useMemo(() => {
    let filtered = competitions.filter(c => categoryFilter === "all" || c.category === categoryFilter);
    
    // Sort
    if (sortBy === "prize") {
      filtered.sort((a, b) => {
        const parseNum = (s: string) => { const m = s?.match(/[\d,]+/); return m ? parseInt(m[0].replace(/,/g, "")) : 0; };
        return parseNum(b.prize) - parseNum(a.prize);
      });
    } else if (sortBy === "deadline") {
      filtered.sort((a, b) => {
        if (!a.deadline) return 1; if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
    } else if (sortBy === "team") {
      filtered.sort((a, b) => {
        const parseTeam = (s: string) => { const m = s?.match(/(\d+)/); return m ? parseInt(m[1]) : 99; };
        const aTeam = parseTeam(a.description); const bTeam = parseTeam(b.description);
        return aTeam - bTeam;
      });
    }
    
    if (sortBy !== "relevance" || !user?.department) return { recommended: filtered, others: [] };
    
    const scored = filtered.map(c => ({ ...c, _score: getRelevanceScore(c, user.department) }));
    const recommended = scored.filter(c => c._score > 0).sort((a, b) => b._score - a._score);
    const others = scored.filter(c => c._score === 0);
    return { recommended, others };
  }, [competitions, categoryFilter, sortBy, user?.department]);

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading competitions…
    </div>
  );

  return (
    <>
      {showCreate && <CreateCompModal onClose={() => setShowCreate(false)} onCreated={load} />}

      {/* Header */}
      <section className="bg-muted/30 border-b border-border py-8">
        <div className="container flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Trophy className="h-7 w-7 text-primary" />
            <div>
              <h1 className="font-display text-2xl font-bold">Competitions &amp; Community</h1>
              <p className="text-sm text-muted-foreground">Track hackathons, build dream teams &amp; submit project entries</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <GenerateButton
                onClick={handleDiscover}
                disabled={discovering}
                isGenerating={discovering}
                label="AI Discover"
                activeLabel="Discovering"
                hue={25}
              />
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90">
                <Plus className="h-4 w-4" />Manual
              </button>
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="container mt-6 flex items-center gap-2">
          <button
            onClick={() => { setActiveTab("competitions"); setSelectedComp(null); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border transition-all",
              activeTab === "competitions"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Trophy className="h-3.5 w-3.5" />
            Browse Competitions &amp; Hackathons
          </button>
          <button
            onClick={() => { setActiveTab("matchmaking"); setSelectedComp(null); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border transition-all",
              activeTab === "matchmaking"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            🤝 Teammate Finder (Team Up)
          </button>
        </div>
      </section>

      <div className="container py-6">
        {activeTab === "matchmaking" ? (
          <TeamMatchmakingBoard />
        ) : (
          <>
            {/* Category Filter */}
        {!selectedComp && competitions.length > 0 && (
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {["all", "hackathon", "competition", "program", "expo", "workshop"].map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-full border transition-all capitalize",
                  categoryFilter === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}>
                {cat === "all" ? "All" : cat}
              </button>
            ))}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs text-muted-foreground mr-1">Sort:</span>
              {(["relevance", "prize", "deadline", "team"] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={cn("px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all capitalize",
                    sortBy === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground")}>
                  {s === "relevance" ? "Best Match" : s === "prize" ? "Prize" : s === "deadline" ? "Deadline" : "Team Size"}
                </button>
              ))}
            </div>
          </div>
        )}
        {selectedComp ? (
          detailLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…
            </div>
          ) : (
            <CompetitionDetail comp={selectedComp} onBack={() => setSelectedComp(null)} onRefresh={refreshDetail} isAdmin={isAdmin} />
          )
        ) : competitions.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-16 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="font-semibold mb-1">No competitions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isAdmin ? "Create a competition to get started." : "No competitions are available right now."}
            </p>
            {isAdmin && (
              <button onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90">
                <Plus className="h-4 w-4" />Create Competition
              </button>
            )}
          </div>
        ) : (
          <>
            {recommended.length > 0 && (
              <>
                {sortBy === "relevance" && user?.department && others.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Recommended for {user.department}</h2>
                    <span className="text-xs text-muted-foreground">({recommended.length})</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommended.map((comp, i) => renderCard(comp, i))}
                </div>
              </>
            )}
            {others.length > 0 && (
              <>
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">All Competitions</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {others.map((comp, i) => renderCard(comp, i))}
                </div>
              </>
            )}
          </>
        )}
          </>
        )}
      </div>
    </>
  );
}
