// frontend/src/components/matchmaking/TeamMatchmakingBoard.tsx
import React, { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Send,
  Trash2,
  ExternalLink,
  ChevronRight,
  Loader2,
  X,
  MessageSquare,
} from "lucide-react";
import { matchmakingApi, competitionsApi } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { TrustScoreBadge } from "@/components/TrustScoreBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  defaultCompetitionId?: string;
  className?: string;
}

export function TeamMatchmakingBoard({ defaultCompetitionId, className }: Props) {
  const { user } = useApp();
  const [posts, setPosts] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompId, setSelectedCompId] = useState(defaultCompetitionId || "all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [applyPost, setApplyPost] = useState<any>(null);
  const [viewAppsPost, setViewAppsPost] = useState<any>(null);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const [pList, cList] = await Promise.all([
        matchmakingApi.list({
          competitionId: selectedCompId !== "all" ? selectedCompId : undefined,
          department: selectedDept !== "all" ? selectedDept : undefined,
        }),
        competitionsApi.list().catch(() => []),
      ]);
      setPosts(pList);
      setCompetitions(cList);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load matchmaking posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [selectedCompId, selectedDept]);

  const filteredPosts = posts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.requiredRoles.some((r: string) => r.toLowerCase().includes(q)) ||
      p.creator.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className={cn("space-y-6", className)}>
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Hackathon Teammate Finder
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Team up with students across departments for upcoming technical hackathons & expos
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Post Team Opening
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-2.5 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search roles, skills, topics…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Competition filter */}
        <select
          value={selectedCompId}
          onChange={(e) => setSelectedCompId(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-[200px] truncate"
        >
          <option value="all">All Competitions</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Department filter */}
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Departments</option>
          <option value="CSE">CSE / IT</option>
          <option value="ECE">ECE / Embedded</option>
          <option value="AIML">AI / ML / Data</option>
          <option value="ME">Mechanical</option>
          <option value="CE">Civil</option>
        </select>
      </div>

      {/* Posts Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-xs">Loading teammate openings…</span>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h3 className="font-semibold text-sm text-foreground">No open team posts found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Be the first to create a team recruitment post for your hackathon idea!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-semibold"
          >
            <Plus className="h-3.5 w-3.5" /> Create Opening
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPosts.map((post) => {
            const isCreator = user?.id === post.creatorId;
            const isFilled = post.status === "FILLED" || post.currentCount >= post.teamSize;

            return (
              <div
                key={post.id}
                className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between hover:border-primary/30 transition-all shadow-sm group"
              >
                <div>
                  {/* Top line: Competition tag & Team Progress */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {post.competition ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 truncate max-w-[200px]">
                          🏆 {post.competition.name}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          General Hackathon Team
                        </span>
                      )}
                      {isFilled && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          ✓ Team Complete
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-mono font-semibold text-muted-foreground shrink-0">
                      {post.currentCount}/{post.teamSize} Members
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-sm text-foreground mb-1.5 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                    {post.description}
                  </p>

                  {/* Required Roles Badges */}
                  <div className="mb-3 space-y-1.5">
                    <div className="text-[11px] font-semibold text-muted-foreground">Open Roles:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {post.requiredRoles.map((role: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Creator info & Actions */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {post.creator.name[0]}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        {post.creator.name}
                        <TrustScoreBadge
                          score={post.creator.trustScore}
                          tier={post.creator.trustTier}
                          isPriorityPass={post.creator.isPriorityPass}
                          size="sm"
                          showScore={false}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground">{post.creator.department}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    {isCreator ? (
                      <button
                        onClick={() => setViewAppsPost(post)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-muted transition-colors border border-border"
                      >
                        Applicants ({post.applications?.length ?? 0})
                      </button>
                    ) : post.hasApplied ? (
                      <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        {post.myApplicationStatus === "ACCEPTED" ? "🎉 Accepted" : "Applied (Pending)"}
                      </span>
                    ) : isFilled ? (
                      <span className="text-xs text-muted-foreground">Filled</span>
                    ) : (
                      <button
                        onClick={() => setApplyPost(post)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                      >
                        <Send className="h-3 w-3" />
                        Join Team
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Team Post Modal */}
      {showCreateModal && (
        <CreateTeamPostModal
          competitions={competitions}
          defaultCompetitionId={selectedCompId !== "all" ? selectedCompId : undefined}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadPosts();
          }}
        />
      )}

      {/* Apply to Team Post Modal */}
      {applyPost && (
        <ApplyTeamModal
          post={applyPost}
          onClose={() => setApplyPost(null)}
          onApplied={() => {
            setApplyPost(null);
            loadPosts();
          }}
        />
      )}

      {/* View Applicants Modal (for creator) */}
      {viewAppsPost && (
        <ViewApplicantsModal
          postId={viewAppsPost.id}
          postTitle={viewAppsPost.title}
          onClose={() => setViewAppsPost(null)}
          onUpdated={() => {
            loadPosts();
          }}
        />
      )}
    </div>
  );
}

// ── Create Modal ──────────────────────────────────────────────
function CreateTeamPostModal({
  competitions,
  defaultCompetitionId,
  onClose,
  onCreated,
}: {
  competitions: any[];
  defaultCompetitionId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [f, setF] = useState({
    title: "",
    description: "",
    competitionId: defaultCompetitionId || "",
    roleInput: "",
    roles: ["Embedded Systems Developer"],
    teamSize: 4,
    currentCount: 1,
    contactInfo: "",
  });
  const [busy, setBusy] = useState(false);

  const addRole = () => {
    if (f.roleInput.trim() && !f.roles.includes(f.roleInput.trim())) {
      setF((p) => ({ ...p, roles: [...p.roles, p.roleInput.trim()], roleInput: "" }));
    }
  };

  const removeRole = (r: string) => {
    setF((p) => ({ ...p, roles: p.roles.filter((x) => x !== r) }));
  };

  const submit = async () => {
    if (!f.title.trim() || !f.description.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    if (f.roles.length === 0) {
      toast.error("Please add at least one required role.");
      return;
    }

    setBusy(true);
    try {
      await matchmakingApi.create({
        title: f.title,
        description: f.description,
        competitionId: f.competitionId || null,
        requiredRoles: f.roles,
        teamSize: Number(f.teamSize),
        currentCount: Number(f.currentCount),
        contactInfo: f.contactInfo,
      });
      toast.success("Team recruitment post published!");
      onCreated();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create post");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-bold text-base font-display text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Post Team Recruitment Opening
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Target Competition / Hackathon
            </label>
            <select
              value={f.competitionId}
              onChange={(e) => setF({ ...f, competitionId: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">General Project Team (No Specific Competition)</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.category || "Hackathon"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Post Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Building Smart IoT Health Monitor — Need 1 ECE & 1 ML dev"
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Project Pitch & What You're Building *
            </label>
            <textarea
              rows={3}
              placeholder="Briefly describe your idea, hardware required, and goals for the hackathon…"
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Roles needed */}
          <div>
            <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Roles You're Looking For *
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. Embedded Firmware (ESP32), UI/UX Designer, ML Dev"
                value={f.roleInput}
                onChange={(e) => setF({ ...f, roleInput: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRole();
                  }
                }}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={addRole}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-muted border border-border"
              >
                Add Role
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {f.roles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded bg-primary/10 text-primary border border-primary/20"
                >
                  {r}
                  <button type="button" onClick={() => removeRole(r)} className="hover:text-rose-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Current Members
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={f.currentCount}
                onChange={(e) => setF({ ...f, currentCount: Number(e.target.value) })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Total Team Size
              </label>
              <input
                type="number"
                min={2}
                max={10}
                value={f.teamSize}
                onChange={(e) => setF({ ...f, teamSize: Number(e.target.value) })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Contact / Discord / WhatsApp (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Discord: alex_iot#1234 or WhatsApp group link"
              value={f.contactInfo}
              onChange={(e) => setF({ ...f, contactInfo: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs rounded-lg border border-border hover:bg-muted font-medium"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Publish Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Apply Modal ──────────────────────────────────────────────
function ApplyTeamModal({
  post,
  onClose,
  onApplied,
}: {
  post: any;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [role, setRole] = useState(post.requiredRoles[0] || "");
  const [pitch, setPitch] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!role) {
      toast.error("Please select the role you want to take.");
      return;
    }

    setBusy(true);
    try {
      await matchmakingApi.apply(post.id, { role, pitch });
      toast.success("Application submitted! The team creator has been notified.");
      onApplied();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to apply");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-bold text-base font-display text-foreground">Apply to Join Team</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="text-xs space-y-3">
          <div className="bg-muted/40 p-3 rounded-lg border border-border space-y-1">
            <div className="font-semibold text-foreground">{post.title}</div>
            <div className="text-muted-foreground text-[11px]">Led by {post.creator.name}</div>
          </div>

          <div>
            <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Select Your Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {post.requiredRoles.map((r: string) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Quick Pitch / Experience (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Tell the team leader about your experience with relevant hardware, code, or tools…"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs rounded-lg border border-border hover:bg-muted font-medium"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send Application"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── View Applicants Modal ─────────────────────────────────────
function ViewApplicantsModal({
  postId,
  postTitle,
  onClose,
  onUpdated,
}: {
  postId: string;
  postTitle: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await matchmakingApi.get(postId);
      setDetails(res);
    } catch (err: any) {
      toast.error("Failed to load applicants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [postId]);

  const handleStatus = async (appId: string, status: "ACCEPTED" | "REJECTED") => {
    setBusyId(appId);
    try {
      await matchmakingApi.updateStatus(appId, status);
      toast.success(status === "ACCEPTED" ? "Applicant accepted!" : "Application rejected");
      load();
      onUpdated();
    } catch (err: any) {
      toast.error(err.message ?? "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="font-bold text-base font-display text-foreground">Review Applicants</h3>
            <p className="text-xs text-muted-foreground truncate max-w-sm">{postTitle}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs">Loading applicants…</span>
          </div>
        ) : !details?.applications || details.applications.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            No applicants yet for this team post.
          </div>
        ) : (
          <div className="space-y-3">
            {details.applications.map((app: any) => (
              <div
                key={app.id}
                className="p-3.5 bg-muted/40 border border-border rounded-xl flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-2">
                      {app.applicant.name}
                      <TrustScoreBadge
                        score={app.applicant.trustScore}
                        tier={app.applicant.trustTier}
                        size="sm"
                        showScore={false}
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {app.applicant.department} • Applied for:{" "}
                      <strong className="text-primary">{app.role}</strong>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      app.status === "ACCEPTED"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : app.status === "REJECTED"
                        ? "bg-rose-500/10 text-rose-500"
                        : "bg-amber-500/10 text-amber-600"
                    )}
                  >
                    {app.status}
                  </span>
                </div>

                {app.pitch && (
                  <p className="text-[11px] text-muted-foreground italic bg-background/50 p-2 rounded-lg border border-border/50">
                    "{app.pitch}"
                  </p>
                )}

                {app.status === "PENDING" && (
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleStatus(app.id, "REJECTED")}
                      disabled={busyId === app.id}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleStatus(app.id, "ACCEPTED")}
                      disabled={busyId === app.id}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      Accept
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
