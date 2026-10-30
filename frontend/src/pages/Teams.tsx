import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Plus, Loader2, Lock } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { teamsApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Team, TeamMember } from "@/types";

// ─── Team card ────────────────────────────────────────────────
function TeamCard({ team, showDeactivate }: { team: Team; showDeactivate?: boolean }) {
  const { deactivateTeam } = useApp();
  const [deactivating, setDeactivating] = useState(false);

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await deactivateTeam(team.id);
      toast.success("Team project marked as completed.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed.");
    } finally { setDeactivating(false); }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-foreground">{team.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{team.project}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="team-id-badge">{team.id}</span>
          <span className={cn("text-xs font-medium", team.active ? "text-status-available" : "text-muted-foreground")}>
            {team.active ? "🟢 Active" : "⚪ Completed"}
          </span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-3">
        Professor: <span className="font-medium text-foreground">{team.professorName}</span> ·
        Created: {team.createdAt} · Members: {team.members.length}
      </div>

      <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
        {team.members.map(m => (
          <div key={m.id} className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold flex-shrink-0">
                {m.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{m.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{m.id}</p>
              </div>
            </div>
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded",
              m.role === "Leader" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              {m.role}
            </span>
          </div>
        ))}
        {team.members.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4">No members yet</div>
        )}
      </div>

      {showDeactivate && team.active && (
        <button onClick={handleDeactivate} disabled={deactivating}
          className="mt-3 w-full text-xs font-medium text-muted-foreground border border-border rounded-lg py-2 hover:bg-muted transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2">
          {deactivating ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Mark Project as Completed
        </button>
      )}
    </div>
  );
}

// ─── Faculty: Create Team form ────────────────────────────────
function CreateTeamForm() {
  const { addTeam, fetchTeams } = useApp();
  const [show,      setShow]      = useState(false);
  const [name,      setName]      = useState("");
  const [project,   setProject]   = useState("");
  const [file,      setFile]      = useState<File | null>(null);
  const [creating,  setCreating]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newTeamCode, setNewTeamCode] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim())    { toast.error("Please enter a team name."); return; }
    if (!project.trim()) { toast.error("Please enter a project name."); return; }
    setCreating(true);
    try {
      const team: any = await teamsApi.create({ name: name.trim(), project: project.trim() });
      setNewTeamCode(team.teamCode);
      toast.success(`Team created! ID: ${team.teamCode}`);
      await fetchTeams();
      // If file provided, upload members
      if (file) {
        setUploading(true);
        try {
          const result: any = await teamsApi.uploadMembers(team.teamCode, file);
          toast.success(`${result.added?.length ?? 0} members added!`);
          if (result.notFound?.length) toast.error(`${result.notFound.length} enrollment IDs not found in DB.`);
          await fetchTeams();
        } catch (err: any) {
          toast.error(err.message ?? "Failed to upload members.");
        } finally { setUploading(false); }
      }
      setName(""); setProject(""); setFile(null);
      setTimeout(() => setShow(false), 1500);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create team.");
    } finally { setCreating(false); }
  };

  return (
    <div className="mt-6">
      {!show ? (
        <button onClick={() => setShow(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors duration-200">
          <Plus className="h-4 w-4" /> Create New Team
        </button>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Create New Team
          </h3>
          {newTeamCode && (
            <div className="mb-4 p-3 bg-status-available/10 border border-status-available/30 rounded-xl text-sm text-status-available">
              ✅ Team created! ID: <strong className="font-mono">{newTeamCode}</strong> — Share this with your students.
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Team Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Smart Robotics Group"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Project Name *</label>
              <input value={project} onChange={e => setProject(e.target.value)} placeholder="e.g. Autonomous Navigation Robot"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Upload Member List — Excel / CSV <span className="normal-case font-normal">(optional, can add after)</span>
              </label>
              <label className={cn(
                "flex flex-col items-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors duration-200",
                file ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30")}>
                <Upload className={cn("h-6 w-6", file ? "text-primary" : "text-muted-foreground")} />
                <span className="text-sm font-medium text-foreground">{file ? file.name : "Click to upload Excel / CSV"}</span>
                <span className="text-xs text-muted-foreground">Columns required: enrollmentId, role (Leader/Member)</span>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files?.[0] ?? null)} className="hidden" />
              </label>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button onClick={handleCreate} disabled={creating || uploading}
                className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors duration-200 disabled:opacity-60 flex items-center justify-center gap-2">
                {(creating || uploading) ? <><Loader2 className="h-4 w-4 animate-spin" />{creating ? "Creating…" : "Uploading…"}</> : "Generate Team ID & Create"}
              </button>
              <button onClick={() => { setShow(false); setFile(null); setNewTeamCode(null); }}
                className="px-5 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors duration-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function Teams() {
  const { role, teams, user, teamsLoading } = useApp();

  const myTeam = role === "student"
    ? teams.find(t => t.active && t.members.some(m => m.id === user?.id))
    : undefined;

  const facultyTeams = role === "faculty" ? teams : [];

  if (teamsLoading) {
    return (
      <div className="container py-20 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading teams…
      </div>
    );
  }

  return (
    <>
      <section className="bg-muted/30 border-b border-border py-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="container">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Team Management</h1>
            <p className="text-muted-foreground">
              Professors create group projects and generate unique Team IDs. Students use the Team ID for collective equipment issuance.
            </p>
          </div>
        </motion.div>
      </section>

      <div className="container py-8 max-w-3xl">

        {/* Student view */}
        {role === "student" && (
          myTeam ? (
            <>
              <div className="mb-5 p-4 bg-status-pending/10 border border-status-pending/30 rounded-xl text-sm flex items-start gap-3">
                <Lock className="h-4 w-4 text-status-pending flex-shrink-0 mt-0.5" />
                <div className="text-status-pending">
                  <strong>Individual requests locked.</strong> You are in active team <strong>{myTeam.id}</strong> ({myTeam.name}).
                  Use your Team ID for all equipment requests until the professor marks the project complete.
                </div>
              </div>
              <TeamCard team={myTeam} />
            </>
          ) : (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">👥</div>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">No Active Team</h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                You are not part of any active team project. Your professor will add you when a group project is assigned via Excel upload.
              </p>
            </div>
          )
        )}

        {/* Faculty view */}
        {role === "faculty" && (
          <>
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Your Teams</h2>
            {facultyTeams.length === 0 && (
              <p className="text-muted-foreground text-sm mb-4">No teams created yet. Create one below.</p>
            )}
            <div className="space-y-4">
              {facultyTeams.map(t => <TeamCard key={t.id} team={t} showDeactivate />)}
            </div>
            <CreateTeamForm />
          </>
        )}

        {/* Admin view */}
        {role === "admin" && (
          <>
            <h2 className="font-display text-xl font-bold text-foreground mb-4">All Teams ({teams.length})</h2>
            <div className="space-y-4">
              {teams.map(t => <TeamCard key={t.id} team={t} />)}
              {teams.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No teams created yet.</div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
