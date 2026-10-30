// frontend/src/components/UniversityManagement.tsx
// NEW FILE — drop this into your AdminDashboard
// Shows only when user?.canManageAdmins === true
// Add this tab in AdminDashboard:
//   import { UniversityManagement } from "@/components/UniversityManagement";
//   {activeTab === "universities" && user?.canManageAdmins && <UniversityManagement />}


import { useState, useEffect, useCallback } from "react";
import {
  Building2, Plus, Search, Edit2, Trash2,
  ToggleLeft, ToggleRight, Loader2, X,
  CheckCircle2, AlertTriangle, Users, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { adminApi } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────
interface College {
  id:        string;
  name:      string;
  isActive:  boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── API helpers ───────────────────────────────────────────────
const collegesApi = {
  list: () => adminApi.colleges(),

  create: (data:any) =>
    adminApi.createCollege(data),

  update: (id:string,data:any) =>
    adminApi.updateCollege(id,data),

  delete: (id:string) =>
    adminApi.deleteCollege(id),
};



// ── Main Component ─────────────────────────────────────────────
export function UniversityManagement() {
  const [colleges,  setColleges]  = useState<College[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<College | null>(null);
  const [deleteId,  setDeleteId]  = useState<string | null>(null);
  const [deleting,  setDeleting]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setColleges(await collegesApi.list()); }
    catch (e: any) { toast.error(e.message ?? "Failed to load universities"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = colleges.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = async (college: College) => {
    try {
      const updated = await collegesApi.update(college.id, { isActive: !college.isActive });
      setColleges(prev => prev.map(c => c.id === updated.id ? updated : c));
      toast.success(`${updated.name} ${updated.isActive ? "activated" : "deactivated"}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { message } = await collegesApi.delete(deleteId);
      setColleges(prev => prev.filter(c => c.id !== deleteId));
      toast.success(message);
      setDeleteId(null);
    } catch (e: any) { toast.error(e.message); }
    finally { setDeleting(false); }
  };

  const handleSave = (saved: College) => {
    if (editTarget) {
      setColleges(prev => prev.map(c => c.id === saved.id ? saved : c));
    } else {
      setColleges(prev => [...prev, saved]);
    }
    setShowModal(false);
    setEditTarget(null);
  };

  const totalUsers = colleges.reduce((s, c) => s + c.userCount, 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            University Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage institutions on the Equipra platform. Super Admin only.
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add University
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Universities", value: colleges.length,                               icon: Building2,    color: "text-primary",          bg: "bg-primary/10"          },
          { label: "Active",             value: colleges.filter(c => c.isActive).length,       icon: CheckCircle2, color: "text-status-available",  bg: "bg-status-available/10"  },
          { label: "Total Users",        value: totalUsers,                                     icon: Users,        color: "text-accent",            bg: "bg-accent/10"           },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border/60 rounded-xl p-4 flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", s.bg)}>
              <s.icon className={cn("h-5 w-5", s.color)} />
            </div>
            <div>
              <div className="text-2xl font-bold font-display text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search universities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          {colleges.length === 0
            ? "No universities yet. Add your first one."
            : "No results for your search."}
        </div>
      ) : (
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["University", "Users", "Status", "Created", "Actions"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map(college => (
                <tr key={college.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground text-sm">{college.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {college.userCount}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                      college.isActive
                        ? "bg-status-available/10 text-status-available border-status-available/25"
                        : "bg-muted text-muted-foreground border-border"
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        college.isActive ? "bg-status-available" : "bg-muted-foreground"
                      )} />
                      {college.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">
                    {new Date(college.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggle(college)}
                        title={college.isActive ? "Deactivate" : "Activate"}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        {college.isActive
                          ? <ToggleRight className="h-4 w-4 text-status-available" />
                          : <ToggleLeft  className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => { setEditTarget(college); setShowModal(true); }}
                        title="Edit"
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(college.id)}
                        title="Delete"
                        className="p-1.5 rounded-lg hover:bg-status-fault/10 transition-colors text-muted-foreground hover:text-status-fault"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <CollegeModal
          college={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-status-fault/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-status-fault" />
              </div>
              <h3 className="font-display font-bold text-lg text-foreground">Delete University</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              This is permanent and cannot be undone.
              <br /><br />
              <span className="text-status-fault font-medium">
                This will fail if the university has active users.
                Deactivate it first, then remove or transfer all users.
              </span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-status-fault text-white py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Trash2  className="h-4 w-4" />}
                Delete
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create / Edit Modal ────────────────────────────────────────
function CollegeModal({
  college, onClose, onSave,
}: {
  college: College | null;
  onClose: () => void;
  onSave:  (c: College) => void;
}) {
  const [name,     setName]     = useState(college?.name     ?? "");
  const [isActive, setIsActive] = useState(college?.isActive ?? true);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const isEdit = !!college;

  const handleSubmit = async () => {
    setError("");
    if (!name.trim() || name.trim().length < 2) {
      setError("University name must be at least 2 characters."); return;
    }
    setLoading(true);
    try {
      let saved: College;
      if (isEdit) {
        saved = await collegesApi.update(college.id, { name: name.trim(), isActive });
        toast.success(`"${saved.name}" updated successfully.`);
      } else {
        saved = await collegesApi.create({ name: name.trim(), isActive });
        toast.success(`"${saved.name}" added to Equipra!`);
      }
      onSave(saved);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl border border-border">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display font-bold text-lg text-foreground">
              {isEdit ? "Edit University" : "Add University"}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Super admin note */}
        <div className="flex items-start gap-2 p-3 bg-primary/8 border border-primary/20 rounded-xl mb-5">
          <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-primary/80">
            Super Admin action — universities added here appear on the login screen for all users.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              University Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Parul University"
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              className={cn(
                "w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40",
                error ? "border-status-fault" : "border-border"
              )}
            />
            {error && (
              <p className="text-xs text-status-fault mt-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {error}
              </p>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl">
            <div>
              <p className="text-sm font-medium text-foreground">Active Status</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inactive universities cannot be selected during login
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                isActive ? "bg-status-available" : "bg-muted-foreground/30"
              )}
            >
              <span className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                isActive ? "translate-x-6" : "translate-x-1"
              )} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              : <><CheckCircle2 className="h-4 w-4" /> {isEdit ? "Save Changes" : "Add University"}</>
            }
          </button>
          <button
            onClick={onClose}
            className="px-5 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
