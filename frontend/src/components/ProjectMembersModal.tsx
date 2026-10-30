// frontend/src/components/ProjectMembersModal.tsx
import { useState } from "react";
import { X, UserPlus, Trash2, Loader2, Search, User } from "lucide-react";
import { projectsApi } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  project: any;
  onClose: () => void;
  onChanged: () => void;
}

export function ProjectMembersModal({ project, onClose, onChanged }: Props) {
  const [enrollmentId, setEnrollmentId] = useState("");
  const [searching, setSearching]       = useState(false);
  const [found, setFound]               = useState<any>(null);
  const [adding, setAdding]             = useState(false);
  const [removingId, setRemovingId]     = useState<string | null>(null);

  const members = project.members ?? [];

  const handleSearch = async () => {
    const id = enrollmentId.trim();
    if (!id) return;
    setSearching(true);
    setFound(null);
    try {
      const user = await projectsApi.lookupUser(id);
      // Don't let them add the project creator/guide again, or an existing member
      if (members.some((m: any) => m.user.id === user.id)) {
        toast.error(`${user.name} is already a member.`);
      } else if (user.id === project.createdBy?.id) {
        toast.error(`${user.name} is the project creator.`);
      } else {
        setFound(user);
      }
    } catch (e: any) {
      toast.error(e.message ?? "No user found with that enrollment ID.");
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!found) return;
    setAdding(true);
    try {
      await projectsApi.addMember(project.id, found.id);
      toast.success(`${found.name} added to project.`);
      setFound(null);
      setEnrollmentId("");
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add member.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from this project?`)) return;
    setRemovingId(userId);
    try {
      await projectsApi.removeMember(project.id, userId);
      toast.success(`${name} removed.`);
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to remove member.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <h2 className="font-display text-lg font-bold">Team Members</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        {/* Add member by enrollment ID */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Add Member by Enrollment ID
          </label>
          <div className="flex gap-2">
            <input value={enrollmentId} onChange={e => setEnrollmentId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="e.g. 2503031070026"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <button onClick={handleSearch} disabled={searching || !enrollmentId.trim()}
              className="px-3 py-2 rounded-lg bg-muted hover:bg-border transition-colors disabled:opacity-50">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>

          {found && (
            <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-primary/8 border border-primary/20">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{found.name}</p>
                  <p className="text-xs text-muted-foreground">{found.enrollmentId} · {found.department}</p>
                </div>
              </div>
              <button onClick={handleAdd} disabled={adding}
                className="flex items-center gap-1 text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 flex-shrink-0">
                {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                Add
              </button>
            </div>
          )}
        </div>

        {/* Current members list */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Current Team ({members.length + 1})
          </p>

          {/* Creator — always shown, can't be removed */}
          {project.createdBy && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 mb-1.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{project.createdBy.name}</p>
                  <p className="text-[10px] text-muted-foreground">{project.createdBy.enrollmentId}</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">Creator</span>
            </div>
          )}

          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No other members yet.</p>
          ) : (
            <div className="space-y-1.5">
              {members.map((m: any) => (
                <div key={m.user.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{m.user.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.user.enrollmentId} · {m.role}</p>
                    </div>
                  </div>
                  <button onClick={() => handleRemove(m.user.id, m.user.name)} disabled={removingId === m.user.id}
                    className="p-1.5 rounded text-muted-foreground hover:text-status-fault hover:bg-status-fault/10 transition-colors flex-shrink-0">
                    {removingId === m.user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
