// frontend/src/components/EditProjectModal.tsx
import { useState } from "react";
import { X, Save, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { projectsApi } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  project: any;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function EditProjectModal({ project, onClose, onSaved, onDeleted }: Props) {
  const [f, setF] = useState({
    name: project.name ?? "",
    description: project.description ?? "",
    department: project.department ?? "",
    semester: project.semester ?? "",
    status: project.status ?? "ACTIVE",
    githubRepo: project.githubRepo ?? "",
    demoVideo: project.demoVideo ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!f.name.trim()) { toast.error("Project name cannot be empty."); return; }
    setBusy(true);
    try {
      await projectsApi.update(project.id, f);
      toast.success("Project updated.");
      onSaved();
      onClose();
    } catch (e: any) { toast.error(e.message ?? "Failed to update project."); }
    finally { setBusy(false); }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await projectsApi.remove(project.id);
      toast.success("Project deleted.");
      onDeleted();
    } catch (e: any) { toast.error(e.message ?? "Failed to delete project."); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <h2 className="font-display text-lg font-bold">Edit Project</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        {!confirmDelete ? (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Project Name *</label>
                <input value={f.name} onChange={e => set("name", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</label>
                <textarea value={f.description} onChange={e => set("description", e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Department</label>
                  <input value={f.department} onChange={e => set("department", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Semester</label>
                  <input value={f.semester} onChange={e => set("semester", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Status</label>
                <select value={f.status} onChange={e => set("status", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">GitHub Repo (optional)</label>
                <input value={f.githubRepo} onChange={e => set("githubRepo", e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Demo Video (optional)</label>
                <input value={f.demoVideo} onChange={e => set("demoVideo", e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setConfirmDelete(true)}
                className="flex items-center justify-center gap-1.5 border border-status-fault/30 text-status-fault rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-status-fault/10 transition-colors">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
              <button onClick={handleSave} disabled={busy}
                className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <><Save className="h-4 w-4" />Save Changes</>}
              </button>
            </div>
          </>
        ) : (
          // Delete confirmation
          <div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-status-fault/10 border border-status-fault/30 mb-5">
              <AlertTriangle className="h-5 w-5 text-status-fault flex-shrink-0" />
              <p className="text-sm text-foreground">
                Delete <span className="font-semibold">{project.name}</span>? This removes all devices, telemetry history, and timeline data permanently. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={busy}
                className="flex-1 bg-status-fault text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-status-fault/90 disabled:opacity-60 flex items-center justify-center gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
