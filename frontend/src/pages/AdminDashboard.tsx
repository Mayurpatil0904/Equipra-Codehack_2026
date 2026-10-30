import { useState, useEffect, useRef } from "react";
import { X, CheckCircle2, XCircle, Plus, Trash2, Pencil, Loader2, RefreshCw, UserPlus, Save, Building2, ShieldCheck, Upload, FileSpreadsheet, Folder, ChevronDown, ChevronRight, RotateCcw, Check, UserX, ImagePlus, QrCode } from "lucide-react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { EquipmentQRCode } from "@/components/EquipmentQRCode";
import { StatusBadge } from "@/components/StatusBadge";
import { TrustScoreBadge } from "@/components/TrustScoreBadge";
import { TrustScoreModal } from "@/components/TrustScoreModal";
import { UniversityManagement } from "@/components/UniversityManagement";
import { ReturnInspectionModal } from "@/components/ReturnInspectionModal";
import { BulkUploadEquipmentModal } from "@/components/BulkUploadEquipmentModal";
import { BulkUploadUsersModal } from "@/components/BulkUploadUsersModal";
import { EquipmentReportModal } from "@/components/EquipmentReportModal";
import { adminApi, requestsApi, equipmentApi } from "@/lib/api";
import { formatDate, countWords, cn } from "@/lib/utils";
import { toast } from "sonner";
import { getEquipmentIcon } from "@/lib/equipmentIcons";

// ✅ Updated Tab type — added "universities"
type Tab = "stats" | "requests" | "students" | "faculty" | "inventory" | "feedback" | "add_user" | "universities";

// ─── Respond Modal ────────────────────────────────────────────
function RespondModal({ reqId, onClose }: { reqId: string; onClose: () => void }) {
  const { requests, fetchRequests } = useApp();
  const req = requests.find(r => r.id === reqId);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const wc = countWords(msg);

  const submit = async () => {
    if (!action) { toast.error("Choose approve or reject."); return; }
    if (!msg.trim()) { toast.error("Write a message for the student."); return; }
    if (wc > 50) { toast.error("Message exceeds 50 words."); return; }
    setBusy(true);
    try {
      await requestsApi.labDecision(reqId, action === "approve", msg.trim());
      await fetchRequests();
      toast.success(action === "approve" ? "✅ Approved! Student notified." : "❌ Rejected. Student notified.");
      onClose();
    } catch (e: any) { toast.error(e.message ?? "Failed."); }
    finally { setBusy(false); }
  };

  if (!req) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm glass-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg p-6 animate-fade-in">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-bold">Respond to Request</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{req.studentName} → {req.itemName}</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <div className="bg-muted/50 rounded-xl p-4 mb-4 text-sm space-y-1">
          <p><span className="text-muted-foreground">Project:</span> <strong>{req.project}</strong></p>
          <p><span className="text-muted-foreground">Purpose:</span> {req.purpose}</p>
          <p><span className="text-muted-foreground">Dates:</span> {formatDate(req.dateFrom)} → {formatDate(req.dateTo)}</p>
          <p><span className="text-muted-foreground">Type:</span> {req.type === "team" ? `Team (${req.teamId})` : "Individual"}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {(["approve", "reject"] as const).map(a => (
            <button key={a} onClick={() => setAction(a)}
              className={cn("flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 transition-all",
                action === a
                  ? a === "approve"
                    ? "border-status-available bg-status-available/10 text-status-available"
                    : "border-status-fault bg-status-fault/10 text-status-fault"
                  : "border-border bg-card text-muted-foreground hover:border-border/60")}>
              {a === "approve" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span className="text-xs font-semibold capitalize">{a}</span>
            </button>
          ))}
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Message to Student (max 50 words)
          </label>
          <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3}
            placeholder="e.g. Approved. Please collect from Lab D301 on Monday at 10am."
            className={cn("w-full rounded-xl border px-3.5 py-2.5 text-sm bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary/40",
              wc > 50 ? "border-status-fault/60" : "border-border")} />
          <p className={cn("text-right text-xs font-mono mt-1", wc > 50 ? "text-status-fault" : "text-muted-foreground")}>
            {wc}/50
          </p>
        </div>
        <button onClick={submit} disabled={busy}
          className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : "Send Response"}
        </button>
      </div>
    </div>
  );
}

// ─── Equipment Modal (Add / Edit) ─────────────────────────────
function EquipmentModal({ onClose, onSaved, existing }: { onClose: () => void; onSaved: () => void; existing?: any }) {
  const isEdit = !!existing;
  const [f, setF] = useState({
    slug: existing?.slug ?? "",
    name: existing?.name ?? "",
    category: existing?.category ?? "",
    description: existing?.description ?? "",
    labLocation: existing?.labLocation ?? "",
    supervisorName: existing?.supervisorName ?? "",
    emoji: existing?.emoji ?? "📦",
    conditionLog: existing?.conditionLog ?? "",
    typicalUses: (existing?.typicalUses ?? []).join(", "),
    availabilityStatus: existing?.availabilityStatus ?? "available",
    // ✅ NEW quantity fields
    totalUnits: existing?.totalUnits ?? 1,
    availableUnits: existing?.availableUnits ?? 1,
    // ✅ NEW — visibility controls
    department: existing?.department ?? "",
    visibleToStudents: existing?.visibleToStudents ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(existing?.imageUrl ?? null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    // ✅ FIX — "slug" removed from required fields. The backend now
    // auto-generates a URL slug from the equipment name (and a separate
    // human-readable Equipment ID like EQ-0001) when left blank.
    const req = ["name", "category", "description", "labLocation", "supervisorName"];
    for (const k of req) { if (!(f as any)[k]) { toast.error(`${k} is required.`); return; } }
    if (f.availableUnits > f.totalUnits) {
      toast.error("Available quantity cannot exceed total quantity."); return;
    }
    setBusy(true);
    try {
      const payload = {
        ...f,
        typicalUses: f.typicalUses.split(",").map((s: string) => s.trim()).filter(Boolean),
        totalUnits: Number(f.totalUnits),
        availableUnits: Number(f.availableUnits),
        // ✅ NEW — empty string means "general equipment" (visible to all departments)
        department: f.department.trim() === "" ? null : f.department.trim(),
        visibleToStudents: f.visibleToStudents,
        ...(imageBase64 && { image: imageBase64 }),
      };
      if (isEdit) { await equipmentApi.update(f.slug, payload); toast.success("Equipment updated!"); }
      else { await equipmentApi.create(payload); toast.success("Equipment added!"); }
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message ?? "Save failed."); }
    finally { setBusy(false); }
  };

  const statuses = ["available", "issued", "reserved", "maintenance", "inspection"];
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm glass-overlay overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-xl p-6 animate-fade-in my-4">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display text-lg font-bold">{isEdit ? "Edit Equipment" : "Add New Equipment"}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEdit ? "Update equipment details in the database." : "Register new equipment to the inventory."}
            </p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              URL Slug
              <span className="normal-case font-normal text-muted-foreground"> (optional)</span>
            </label>
            <input value={f.slug} onChange={e => set("slug", e.target.value)}
              disabled={isEdit}
              placeholder="Auto-generated from name if left blank"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50" />
            {!isEdit && (
              <p className="text-[11px] text-muted-foreground mt-1">
                A unique <strong>Equipment ID</strong> (e.g. EQ-0001) and display icon (based on Category) are generated automatically — this slug is only used in the page URL.
              </p>
            )}
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Equipment Image <span className="normal-case font-normal">(optional)</span>
            </label>
            {imagePreview ? (
              <div className="relative group">
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border border-border" />
                <button type="button" onClick={() => { setImagePreview(null); setImageBase64(null); }}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 hover:border-primary/30 transition-colors"
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={e => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]); }}
              >
                <ImagePlus className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <span className="text-xs text-muted-foreground">Click or drag & drop an image</span>
                <span className="text-[10px] text-muted-foreground/60 mt-0.5">PNG, JPG up to 5MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]); }} />
              </label>
            )}
          </div>
          {[
            { k: "name", l: "Equipment Name *" },
            { k: "category", l: "Category *" },
            { k: "labLocation", l: "Lab Location *" },
            { k: "supervisorName", l: "Supervisor Name *" },
          ].map(({ k, l }) => (
            <div key={k}>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{l}</label>
              <input value={(f as any)[k]} onChange={e => set(k, e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          ))}

          {/* ✅ NEW — Quantity fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Total Units in Lab *
              </label>
              <input type="number" min={1} value={f.totalUnits}
                onChange={e => set("totalUnits", Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              <p className="text-xs text-muted-foreground mt-1">How many physical units exist in the lab.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Available to Lend *
              </label>
              <input type="number" min={0} max={f.totalUnits} value={f.availableUnits}
                onChange={e => set("availableUnits", Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              <p className="text-xs text-muted-foreground mt-1">Auto-updates when requests are approved.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Availability Status
            </label>
            <select value={f.availabilityStatus} onChange={e => set("availabilityStatus", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 capitalize">
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* ✅ NEW — Department-scoped visibility */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Department <span className="normal-case font-normal">(leave blank for general equipment, visible to all departments)</span>
            </label>
            <input value={f.department} onChange={e => set("department", e.target.value)}
              placeholder="e.g. Computer Science — leave empty for general equipment"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>

          {/* ✅ NEW — Visibility toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={f.visibleToStudents}
              onChange={e => set("visibleToStudents", e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-sm text-foreground">
              Visible to students
              <span className="block text-xs text-muted-foreground font-normal">
                Uncheck to make this equipment faculty/admin-only (e.g. supervisor-only gear).
              </span>
            </span>
          </label>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description *</label>
            <textarea value={f.description} onChange={e => set("description", e.target.value)} rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Typical Uses <span className="normal-case font-normal">(comma separated)</span>
            </label>
            <input value={f.typicalUses} onChange={e => set("typicalUses", e.target.value)}
              placeholder="e.g. IoT Prototyping, Sensor Integration"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Condition Notes</label>
            <input value={f.conditionLog} onChange={e => set("conditionLog", e.target.value)}
              placeholder="e.g. Excellent condition, all connectors intact"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
        <button onClick={save} disabled={busy}
          className="w-full mt-5 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <><Save className="h-4 w-4" />{isEdit ? "Save Changes" : "Add Equipment"}</>}
        </button>
      </div>
    </div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────
function AddUserModal({ onClose, onSaved, defaultRole, isSuperAdmin }: {
  onClose: () => void;
  onSaved: () => void;
  defaultRole?: string;
  // ✅ NEW — controls whether ADMIN role option is shown
  isSuperAdmin?: boolean;
}) {
  const [f, setF] = useState({
    enrollmentId: "", name: "", email: "", password: "", confirmPassword: "",
    role: defaultRole ?? "STUDENT", department: "", semester: "1st", collegeName: "Parul University",
  });
  // ✅ NEW — canManageAdmins checkbox for super admins creating admins
  const [canManageAdmins, setCanManageAdmins] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const colleges = ["Parul University", "MS University", "SVNIT", "PDPU", "GEC Vadodara"];
  const depts = ["Electronics & Communication", "Computer Science", "Mechanical", "Civil", "Instrumentation", "Laboratory", "Information Technology"];

  // ✅ Only super admins see ADMIN role option
  const availableRoles = isSuperAdmin
    ? [{ v: "STUDENT", e: "🎓", l: "Student" }, { v: "FACULTY", e: "👨‍🏫", l: "Faculty" }, { v: "ADMIN", e: "🛡️", l: "Admin/Lab" }]
    : [{ v: "STUDENT", e: "🎓", l: "Student" }, { v: "FACULTY", e: "👨‍🏫", l: "Faculty" }];

  const save = async () => {
    if (!f.enrollmentId || !f.name || !f.password || !f.department) {
      toast.error("Please fill all required fields."); return;
    }
    if (f.password !== f.confirmPassword) { toast.error("Passwords do not match."); return; }
    if (f.password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      await adminApi.createUser({
        ...f,
        confirmPassword: undefined,
        // ✅ Include canManageAdmins only when creating an ADMIN
        ...(f.role === "ADMIN" && isSuperAdmin ? { canManageAdmins } : {}),
      });
      toast.success(`${f.name} added successfully!`);
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message ?? "Failed."); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm glass-overlay overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-xl p-6 animate-fade-in my-4">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display text-lg font-bold">Add New User</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Register with enrollment ID and initial password.</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        {/* Role selector */}
        <div className={cn("grid gap-2 mb-4", availableRoles.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
          {availableRoles.map(r => (
            <button key={r.v} onClick={() => set("role", r.v)}
              className={cn("flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all",
                f.role === r.v ? "border-primary bg-primary/8 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
              <span className="text-xl">{r.e}</span>{r.l}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Enrollment / Employee ID *</label>
              <input value={f.enrollmentId} onChange={e => set("enrollmentId", e.target.value)} placeholder="e.g. PU-STU-025"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Full Name *</label>
              <input value={f.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Riya Shah"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Email (Optional)</label>
            <input type="email" value={f.email} onChange={e => set("email", e.target.value)} placeholder="e.g. riya@parul.edu"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">College *</label>
              <select value={f.collegeName} onChange={e => set("collegeName", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                {colleges.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Department *</label>
              <select value={f.department} onChange={e => set("department", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="">— Select —</option>
                {depts.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          {f.role === "STUDENT" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Semester</label>
              <select value={f.semester} onChange={e => set("semester", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Password *</label>
              <input type="password" value={f.password} onChange={e => set("password", e.target.value)} placeholder="Min 6 chars"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Confirm Password *</label>
              <input type="password" value={f.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} placeholder="Repeat"
                className={cn("w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40",
                  f.confirmPassword && f.password !== f.confirmPassword ? "border-status-fault/60" : "border-border")} />
            </div>
          </div>

          {/* ✅ NEW — Super Admin checkbox — only shown when creating an ADMIN and current user is super admin */}
          {f.role === "ADMIN" && isSuperAdmin && (
            <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canManageAdmins}
                  onChange={e => setCanManageAdmins(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-primary cursor-pointer"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Grant Super Admin permissions
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This admin can create/remove other admins and manage universities. Only grant to trusted administrators.
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        <button onClick={save} disabled={busy}
          className="w-full mt-5 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Creating…</> : <><UserPlus className="h-4 w-4" />Add User</>}
        </button>
      </div>
    </div>
  );
}

// ─── Reset Password Modal ─────────────────────────────────────
function ResetPwModal({ user, onClose }: { user: { id: string; name: string }; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (pw.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      await adminApi.resetUserPassword(user.id, pw);
      toast.success(`Password reset for ${user.name}!`);
      onClose();
    } catch (e: any) { toast.error(e.message ?? "Failed."); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm glass-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm p-6 animate-fade-in">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-bold">Reset Password</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Set new password for <strong>{user.name}</strong></p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">New Password *</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Min 6 characters"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <button onClick={save} disabled={busy}
          className="w-full mt-4 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : "Reset Password"}
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { requests, feedbacks, markFeedbackRead, teams, fetchRequests, user } = useApp();

  const tabBarRef = useRef<HTMLDivElement>(null);
  const [tabGlowVisible, setTabGlowVisible] = useState(false);
  const handleTabSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = tabBarRef.current;
    if (!el) return;
    setTabGlowVisible(true);
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--tab-spot-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--tab-spot-y', `${e.clientY - rect.top}px`);
  };
  const handleTabSpotlightLeave = () => setTabGlowVisible(false);

  // ✅ Read canManageAdmins from user context
  const isSuperAdmin = user?.canManageAdmins === true;

  const [tab, setTab] = useState<Tab>("stats");
  const [respondId, setRespondId] = useState<string | null>(null);
  const [showAddEq, setShowAddEq] = useState(false);
  const [editEq, setEditEq] = useState<any>(null);
  const [qrItem, setQrItem] = useState<any>(null);
  // ✅ NEW — bulk upload + transaction report modals
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showBulkUploadUsers, setShowBulkUploadUsers] = useState(false);
  const [addRole, setAddRole] = useState("STUDENT");
  const [resetPwUser, setResetPwUser] = useState<{ id: string; name: string } | null>(null);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loadEq, setLoadEq] = useState(false);
  const [loadU, setLoadU] = useState(false);
  const [selectedStudentTrustId, setSelectedStudentTrustId] = useState<string | null>(null);
  const unread = feedbacks.filter(f => !f.read).length;

  // ✅ TABS — Universities tab only shows for super admins
  const pendingCount =
  (stats?.requests?.pendingFaculty ?? 0) +
  (stats?.requests?.pendingLab ?? 0);

const TABS: { id: Tab; label: string }[] = [
  { id: "stats", label: "📊 Statistics" },

  {
    id: "requests",
    label:
      pendingCount > 0
        ? `📋 Requests (${pendingCount})`
        : "📋 Requests",
  },

  { id: "students", label: "🎓 Students" },

  { id: "faculty", label: "👨‍🏫 Faculty" },

  { id: "inventory", label: "🔧 Inventory" },

  {
    id: "feedback",
    label:
      (stats?.feedback?.unread ?? 0) > 0
        ? `💬 Feedback (${stats.feedback.unread})`
        : "💬 Feedback",
  },

  { id: "add_user", label: "➕ Add User" },

  ...(isSuperAdmin
    ? [
        {
          id: "universities" as Tab,
          label: "🏛 Universities",
        },
      ]
    : []),
];

  const loadEquip = async () => {
    setLoadEq(true);
    try { setEquipment(await equipmentApi.list()); } catch { }
    finally { setLoadEq(false); }
  };
  const loadUsers = async (role?: string) => {
    setLoadU(true);
    try { setUsers(await adminApi.users(role ? { role } : {})); } catch { }
    finally { setLoadU(false); }
  };
  const loadStats = async () => {
    try { setStats(await adminApi.stats()); } catch { }
  };

  useEffect(() => {
    if (tab === "inventory") loadEquip();
    else if (tab === "students") { loadStudents(); loadFolderLabels(); }
    else if (tab === "faculty") loadUsers("FACULTY");
    else if (tab === "stats") loadStats();
  }, [tab]);

  const deleteEquip = async (slug: string, name: string) => {
    if (!confirm(`Remove "${name}" from inventory?`)) return;
    try { await equipmentApi.remove(slug); toast.success(`${name} removed.`); loadEquip(); }
    catch (e: any) { toast.error(e.message); }
  };

  // ✅ NEW — Pass/Fail a unit sitting in the inspection queue or 24h hold
  const handleClearInspection = async (slug: string, action: "pass" | "fail") => {
    try {
      await requestsApi.clearInspection(slug, action);
      toast.success(action === "pass" ? "Unit cleared — now available." : "Unit moved to maintenance.");
      loadEquip();
    } catch (e: any) { toast.error(e.message ?? "Failed to update inspection status."); }
  };

  const deactivateUser = async (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"? They will no longer be able to log in.`)) return;
    try { await adminApi.deactivateUser(id); toast.success(`${name} deactivated.`); loadUsers(); loadStudents(); }
    catch (e: any) { toast.error(e.message); }
  };

  // ✅ NEW — reactivate a deactivated user (used in the Deactivated Students view)
  const reactivateUserHandler = async (id: string, name: string, onDone?: () => void) => {
    try {
      await adminApi.reactivateUser(id);
      toast.success(`${name} reactivated — they can log in again.`);
      onDone?.();
    } catch (e: any) { toast.error(e.message ?? "Failed to reactivate user."); }
  };

  // ✅ NEW — permanently delete a user (Students active/deactivated views + Faculty)
  const deleteUserHandler = async (id: string, name: string, onDone?: () => void) => {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone and will remove their request history.`)) return;
    try {
      await adminApi.deleteUser(id);
      toast.success(`${name} permanently deleted.`);
      onDone?.();
    } catch (e: any) { toast.error(e.message ?? "Failed to delete user."); }
  };

  // ✅ NEW — Students tab: active/deactivated view, folder grouping by semester
  const [studentView, setStudentView] = useState<"active" | "deactivated">("active");
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [folderLabels, setFolderLabels] = useState<Record<string, string>>({});

  const loadStudents = async (view: "active" | "deactivated" = studentView) => {
    setLoadingStudents(true);
    try {
      const data = await adminApi.users({ role: "STUDENT", isActive: view === "active" ? "true" : "false" });
      setStudents(data);
    } catch { }
    finally { setLoadingStudents(false); }
  };

  const loadFolderLabels = async () => {
    try {
      const folders = await adminApi.listSemesterFolders();
      const map: Record<string, string> = {};
      folders.forEach((f: any) => { map[f.key] = f.label; });
      setFolderLabels(map);
    } catch { }
  };

  const renameFolder = async (key: string, label: string) => {
    try {
      await adminApi.upsertSemesterFolder(key, label);
      setFolderLabels(prev => ({ ...prev, [key]: label }));
      toast.success("Folder renamed.");
    } catch (e: any) { toast.error(e.message ?? "Failed to rename folder."); }
  };

  const updateStudentSemester = async (id: string, semester: string) => {
    try {
      await adminApi.updateUser(id, { semester });
      toast.success("Semester updated.");
      loadStudents();
    } catch (e: any) { toast.error(e.message ?? "Failed to update semester."); }
  };

  const changeStudentView = (view: "active" | "deactivated") => {
    setStudentView(view);
    loadStudents(view);
  };

  // Return inspection modal state
  const [returnReq, setReturnReq] = useState<any | null>(null);

  return (
    <>
      {respondId   && <RespondModal reqId={respondId} onClose={() => setRespondId(null)} />}
      {showAddEq   && <EquipmentModal onClose={() => setShowAddEq(false)} onSaved={loadEquip} />}
      {/* ✅ NEW */}
      {showBulkUpload && <BulkUploadEquipmentModal onClose={() => setShowBulkUpload(false)} onDone={loadEquip} />}
      {showReport     && <EquipmentReportModal onClose={() => setShowReport(false)} />}
      {editEq      && <EquipmentModal onClose={() => setEditEq(null)} onSaved={loadEquip} existing={editEq} />}
      {qrItem      && <EquipmentQRCode slug={qrItem.slug} name={qrItem.name} equipmentId={qrItem.equipmentId} onClose={() => setQrItem(null)} />}
      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onSaved={() => loadUsers()}
          defaultRole={addRole}
          isSuperAdmin={isSuperAdmin}
        />
      )}
      {resetPwUser && <ResetPwModal user={resetPwUser} onClose={() => setResetPwUser(null)} />}
      {showBulkUploadUsers && <BulkUploadUsersModal onClose={() => setShowBulkUploadUsers(false)} onDone={() => loadUsers()} />}
      {returnReq && (
        <ReturnInspectionModal
          request={returnReq}
          onClose={() => setReturnReq(null)}
          onDone={() => fetchRequests()}
        />
      )}
      {selectedStudentTrustId && (
        <TrustScoreModal
          userId={selectedStudentTrustId}
          onClose={() => setSelectedStudentTrustId(null)}
        />
      )}

      <section className="bg-muted/30 border-b border-border py-10">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <h1 className="font-display text-3xl font-bold mb-2">
              Control Center
              {/* ✅ Super Admin badge */}
              {isSuperAdmin && (
                <span className="ml-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 align-middle">
                  <ShieldCheck className="h-3.5 w-3.5" /> Super Admin
                </span>
              )}
            </h1>
            <p className="text-muted-foreground">Manage equipment, users, requests, and all platform data.</p>
          </motion.div>
        </div>
      </section>

      <div className="container py-6">
        {/* Tab bar */}
        <div
          ref={tabBarRef}
          onMouseMove={handleTabSpotlight}
          onMouseLeave={handleTabSpotlightLeave}
          className="relative overflow-hidden flex gap-1 bg-muted/50 border border-border rounded-xl p-1 mb-6 overflow-x-auto flex-nowrap"
        >
          <div className="pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-300" style={{ opacity: tabGlowVisible ? 1 : 0, background: 'radial-gradient(200px circle at var(--tab-spot-x, 50%) var(--tab-spot-y, 50%), hsl(var(--primary) / 0.08), transparent 60%)' }} />
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn("relative z-10 flex-1 min-w-max px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-200",
                tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        {tab === "stats" && <StatsTab stats={stats} />}
        {/* Requests */}
        {tab === "requests" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">{requests.length} total</p>
              <button onClick={fetchRequests} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                <RefreshCw className="h-3 w-3" />Refresh
              </button>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Request ID</th><th>Student</th><th>Equipment</th>
                      <th>Project</th><th>Type</th><th>Dates</th><th>Status</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r: any) => (
                      <tr key={r.id} className={r.isPriorityPassUsed ? "bg-amber-500/5 font-medium" : ""}>
                        <td className="font-mono text-xs">
                          <div>{String(r.id).slice(0, 8)}…</div>
                          {r.isPriorityPassUsed && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-1">
                              ⚡ Fast-Track
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="font-medium flex items-center gap-1.5 flex-wrap">
                            <span>{r.studentName}</span>
                            {r.studentTrust && (
                              <TrustScoreBadge
                                score={r.studentTrust.score}
                                tier={r.studentTrust.tier}
                                size="sm"
                                onClick={() => setSelectedStudentTrustId(r.studentId)}
                              />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">{r.studentId}</div>
                        </td>
                        <td>
                          <div className="font-medium">{r.itemName}</div>
                          {r.isPriorityPassUsed && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">
                              15 pts burned
                            </span>
                          )}
                        </td>
                        <td className="max-w-[150px] truncate">{r.project}</td>
                        <td>
                          {r.type === "team"
                            ? <span className="team-id-badge text-[10px] py-0.5 px-2">{r.teamId}</span>
                            : <span className="text-xs text-muted-foreground">Individual</span>}
                        </td>
                        <td className="text-xs whitespace-nowrap">
                          {formatDate(r.dateFrom)}<br />to {formatDate(r.dateTo)}
                        </td>
                        <td><StatusBadge type="request" status={r.status} /></td>
                        <td>
                          {r.status === "pending_lab" && (
                            <button onClick={() => setRespondId(r.id)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                              Respond
                            </button>
                          )}
                          {r.status === "pending_faculty" && (
                            <span className="text-xs text-muted-foreground">Faculty pending</span>
                          )}
                          {/* Mark as returned button — opens inspection modal */}
                          {(r.status === "approved" || r.status === "issued") && (
                            <button
                              onClick={() => setReturnReq(r)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-status-available/10 text-status-available hover:bg-status-available hover:text-white transition-colors">
                              ✓ Mark Returned
                            </button>
                          )}
                          {r.status === "rejected" && (
                            <span className="text-xs text-status-fault font-medium">❌ Rejected</span>
                          )}
                          {r.status === "returned" && (
                            <span className="text-xs text-muted-foreground font-medium">↩ Returned</span>
                          )}
                          {r.status === "returned_pending_inspection" && (
                            <span className="text-xs text-status-pending font-medium">🔍 Inspection Hold</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {requests.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No requests yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Students */}
        {tab === "students" && (
          <StudentsTab
            view={studentView} onChangeView={changeStudentView}
            students={students} loading={loadingStudents}
            folderLabels={folderLabels} onRenameFolder={renameFolder}
            onAdd={() => { setAddRole("STUDENT"); setShowAddUser(true); }}
            onBulkUpload={() => setShowBulkUploadUsers(true)}
            onRefresh={() => loadStudents()} teams={teams}
            onDeactivate={deactivateUser}
            onReactivate={(id: string, name: string) => reactivateUserHandler(id, name, () => loadStudents())}
            onDelete={(id: string, name: string) => deleteUserHandler(id, name, () => loadStudents())}
            onResetPw={(id: string, name: string) => setResetPwUser({ id, name })}
            onUpdateSemester={updateStudentSemester}
            onViewTrustScore={(id: string) => setSelectedStudentTrustId(id)}
          />
        )}

        {/* Faculty */}
        {tab === "faculty" && (
          <UsersTab users={users} loading={loadU} roleLabel="Faculty"
            onAdd={() => { setAddRole("FACULTY"); setShowAddUser(true); }}
            onBulkUpload={() => setShowBulkUploadUsers(true)}
            onRefresh={() => loadUsers("FACULTY")} teams={teams}
            onDeactivate={deactivateUser}
            onDelete={(id: string, name: string) => deleteUserHandler(id, name, () => loadUsers("FACULTY"))}
            onResetPw={(id, name) => setResetPwUser({ id, name })} />
        )}

        {/* Inventory */}
        {tab === "inventory" && (
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <p className="text-sm text-muted-foreground">{equipment.length} items</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={loadEquip} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <RefreshCw className="h-3 w-3" />Refresh
                </button>
                {/* ✅ NEW — Download transaction report */}
                <button onClick={() => setShowReport(true)}
                  className="flex items-center gap-1.5 border border-border px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                  <FileSpreadsheet className="h-3.5 w-3.5" />Download Report
                </button>
                {/* ✅ NEW — Bulk upload */}
                <button onClick={() => setShowBulkUpload(true)}
                  className="flex items-center gap-1.5 border border-border px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                  <Upload className="h-3.5 w-3.5" />Bulk Upload
                </button>
                <button onClick={() => setShowAddEq(true)}
                  className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">
                  <Plus className="h-3.5 w-3.5" />Add Equipment
                </button>
              </div>
            </div>
            {loadEq ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…
              </div>
            ) : (
              <>
              {/* ✅ Desktop/tablet — full table, horizontally scrollable */}
              <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="data-table min-w-[1080px]">
                    <thead>
                      <tr>
                        <th>Equipment ID</th><th>Name</th><th>Category</th><th>Dept</th><th>Location</th>
                        {/* ✅ NEW columns */}
                        <th>Qty</th><th>Available</th><th>Pending/Insp.</th>
                        <th>Status</th><th>Condition</th><th>Supervisor</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipment.map((h: any) => (
                        <tr key={h.id}>
                          <td className="font-mono text-xs">
                            <span className="font-semibold text-foreground">{h.equipmentId ?? "—"}</span>
                            <span className="block text-[10px] text-muted-foreground">{h.slug}</span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              {(() => { const RowIcon = getEquipmentIcon(h.category); return <RowIcon className="h-4 w-4 text-primary flex-shrink-0" />; })()}
                              <span className="font-medium">{h.name}</span>
                            </div>
                            {h.visibleToStudents === false && (
                              <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Staff only</span>
                            )}
                          </td>
                          <td className="text-muted-foreground">{h.category}</td>
                          <td className="text-muted-foreground text-xs">{h.department ?? <span className="italic text-muted-foreground/60">General</span>}</td>
                          <td className="text-muted-foreground text-xs">{h.labLocation}</td>
                          {/* ✅ Quantity columns */}
                          <td className="text-center font-medium">{h.totalUnits ?? 1}</td>
                          <td className="text-center">
                            <span className={cn(
                              "font-bold",
                              (h.availableUnits ?? 1) === 0
                                ? "text-status-fault"
                                : "text-status-available"
                            )}>
                              {h.availableUnits ?? 1}
                            </span>
                          </td>
                          {/* ✅ NEW — pending (24h hold) / inspection-queue units */}
                          <td className="text-center text-xs">
                            {((h.pendingUnits ?? 0) > 0 || (h.inspectionUnits ?? 0) > 0) ? (
                              <div className="flex flex-col items-center gap-1">
                                {(h.pendingUnits ?? 0) > 0 && (
                                  <span className="text-status-pending font-semibold">{h.pendingUnits} on hold</span>
                                )}
                                {(h.inspectionUnits ?? 0) > 0 && (
                                  <span className="text-status-issued font-semibold">{h.inspectionUnits} to inspect</span>
                                )}
                                <div className="flex gap-1">
                                  <button onClick={() => handleClearInspection(h.slug, "pass")}
                                    title="Mark as passed — return to available pool"
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-status-available/10 text-status-available hover:bg-status-available hover:text-white transition-colors font-semibold">
                                    ✓ Pass
                                  </button>
                                  <button onClick={() => handleClearInspection(h.slug, "fail")}
                                    title="Mark as failed — send to maintenance"
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-status-fault/10 text-status-fault hover:bg-status-fault hover:text-white transition-colors font-semibold">
                                    ✗ Fail
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td><StatusBadge type="availability" status={h.availabilityStatus} /></td>
                          <td className="text-xs text-muted-foreground max-w-[130px] truncate">{h.conditionLog}</td>
                          <td className="text-muted-foreground">{h.supervisorName}</td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => setQrItem(h)} title="QR Code"
                                className="text-xs px-2 py-1 rounded border border-border hover:bg-muted/50 transition-colors font-medium flex items-center gap-1">
                                <QrCode className="h-3.5 w-3.5" />QR
                              </button>
                              <button onClick={() => setEditEq(h)}
                                className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors font-medium flex items-center gap-1">
                                <Pencil className="h-3 w-3" />Edit
                              </button>
                              <button onClick={() => deleteEquip(h.slug, h.name)}
                                className="text-xs px-2 py-1 rounded bg-status-fault/10 text-status-fault hover:bg-status-fault hover:text-white transition-colors font-medium flex items-center gap-1">
                                <Trash2 className="h-3 w-3" />Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {equipment.length === 0 && (
                        <tr><td colSpan={12} className="text-center py-8 text-muted-foreground">No equipment found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ✅ NEW — Mobile: stacked cards instead of a horizontally-scrolling table */}
              <div className="md:hidden space-y-3">
                {equipment.map((h: any) => {
                  const RowIcon = getEquipmentIcon(h.category);
                  return (
                    <div key={h.id} className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <RowIcon className="h-5 w-5 text-primary flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{h.name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{h.equipmentId ?? "—"}</p>
                          </div>
                        </div>
                        <StatusBadge type="availability" status={h.availabilityStatus} />
                      </div>

                      {h.visibleToStudents === false && (
                        <span className="inline-block mb-2 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Staff only</span>
                      )}

                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mb-3">
                        <div><span className="text-muted-foreground">Category: </span>{h.category}</div>
                        <div><span className="text-muted-foreground">Dept: </span>{h.department ?? "General"}</div>
                        <div><span className="text-muted-foreground">Location: </span>{h.labLocation}</div>
                        <div><span className="text-muted-foreground">Supervisor: </span>{h.supervisorName}</div>
                        <div><span className="text-muted-foreground">Qty: </span>{h.totalUnits ?? 1}</div>
                        <div>
                          <span className="text-muted-foreground">Available: </span>
                          <span className={cn("font-semibold", (h.availableUnits ?? 1) === 0 ? "text-status-fault" : "text-status-available")}>
                            {h.availableUnits ?? 1}
                          </span>
                        </div>
                      </div>

                      {((h.pendingUnits ?? 0) > 0 || (h.inspectionUnits ?? 0) > 0) && (
                        <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2 mb-3">
                          <div className="text-xs">
                            {(h.pendingUnits ?? 0) > 0 && <span className="text-status-pending font-semibold block">{h.pendingUnits} on hold</span>}
                            {(h.inspectionUnits ?? 0) > 0 && <span className="text-status-issued font-semibold block">{h.inspectionUnits} to inspect</span>}
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={() => handleClearInspection(h.slug, "pass")}
                              className="text-[10px] px-2 py-1 rounded bg-status-available/10 text-status-available font-semibold">
                              ✓ Pass
                            </button>
                            <button onClick={() => handleClearInspection(h.slug, "fail")}
                              className="text-[10px] px-2 py-1 rounded bg-status-fault/10 text-status-fault font-semibold">
                              ✗ Fail
                            </button>
                          </div>
                        </div>
                      )}

                      {h.conditionLog && (
                        <p className="text-xs text-muted-foreground mb-3">
                          <span className="font-medium">Condition: </span>{h.conditionLog}
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                        <button onClick={() => setQrItem(h)} title="QR Code"
                          className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded border border-border hover:bg-muted/50 transition-colors font-medium">
                          <QrCode className="h-3.5 w-3.5" />QR Code
                        </button>
                        <button onClick={() => setEditEq(h)}
                          className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded bg-primary/10 text-primary font-medium">
                          <Pencil className="h-3 w-3" />Edit
                        </button>
                        <button onClick={() => deleteEquip(h.slug, h.name)}
                          className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded bg-status-fault/10 text-status-fault font-medium">
                          <Trash2 className="h-3 w-3" />Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
                {equipment.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-xl">No equipment found.</div>
                )}
              </div>
              </>
            )}
          </div>
        )}

        {/* Feedback */}
        {tab === "feedback" && (
          feedbacks.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <div className="text-4xl mb-3">💬</div>
              <p>No feedback received yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((f: any) => (
                <div key={f.id} className={cn("bg-card border rounded-xl p-5",
                  !f.read ? "border-primary/40 bg-primary/5" : "border-border")}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{f.submittedByName}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground capitalize">{f.role}</span>
                        {!f.read && <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded font-semibold">New</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {f.department} · {f.type} · {new Date(f.createdAt).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    {f.rating > 0 && (
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <span key={n} className={n <= f.rating ? "text-yellow-400" : "text-muted-foreground/30"}>★</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{f.message}</p>
                  {!f.read && (
                    <button onClick={() => markFeedbackRead(f.id)} className="mt-3 text-xs text-primary font-medium hover:underline">
                      Mark as read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* Add User shortcut */}
        {tab === "add_user" && (
          <div className="max-w-xl mx-auto">
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <UserPlus className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-foreground mb-2">Add New User</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Register a new student, faculty member, or lab assistant with their enrollment ID and password.
              </p>
              <div className={`grid gap-3 ${isSuperAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
                {[
                  { r: "STUDENT", e: "🎓", l: "Add Student" },
                  { r: "FACULTY", e: "👨‍🏫", l: "Add Faculty" },
                  // ✅ Only super admins see Add Admin button
                  ...(isSuperAdmin ? [{ r: "ADMIN", e: "🛡️", l: "Add Admin" }] : []),
                ].map(x => (
                  <button key={x.r} onClick={() => { setAddRole(x.r); setShowAddUser(true); }}
                    className="flex flex-col items-center gap-2 p-4 bg-primary/8 border border-primary/20 rounded-xl text-primary hover:bg-primary/15 transition-colors">
                    <span className="text-2xl">{x.e}</span>
                    <span className="text-xs font-semibold">{x.l}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ✅ Universities — SUPER ADMIN ONLY */}
        {tab === "universities" && isSuperAdmin && (
          <UniversityManagement />
        )}
      </div>
    </>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────
function StatsTab({ stats }: any) {
  const cards = [
  {
    l: "Total Requests",
    v: stats?.requests?.total ?? "—",
    c: "bg-primary/10 text-primary",
    e: "📋",
  },
  {
    l: "Pending Faculty",
    v: stats?.requests?.pendingFaculty ?? "—",
    c: "bg-status-pending/10 text-status-pending",
    e: "⏳",
  },
  {
    l: "Pending Lab",
    v: stats?.requests?.pendingLab ?? "—",
    c: "bg-status-issued/10 text-status-issued",
    e: "🔬",
  },
  {
    l: "Approved",
    v: stats?.requests?.approved ?? "—",
    c: "bg-status-available/10 text-status-available",
    e: "✅",
  },
  {
    l: "Rejected",
    v: stats?.requests?.rejected ?? "—",
    c: "bg-status-fault/10 text-status-fault",
    e: "❌",
  },
  {
    l: "Active Teams",
    v: stats?.teams?.active ?? "—",
    c: "bg-status-maintenance/10 text-status-maintenance",
    e: "👥",
  },
  {
    l: "Total Equipment",
    v: stats?.equipment?.total ?? "—",
    c: "bg-primary/10 text-primary",
    e: "📦",
  },
  {
    l: "Available Equipment",
    v: stats?.equipment?.available ?? "—",
    c: "bg-status-available/10 text-status-available",
    e: "✅",
  },
  {
    l: "Issued Equipment",
    v: stats?.equipment?.issued ?? "—",
    c: "bg-status-issued/10 text-status-issued",
    e: "📤",
  },
  {
    l: "Students",
    v: stats?.users?.students ?? "—",
    c: "bg-accent/10 text-accent",
    e: "🎓",
  },
  {
    l: "Faculty",
    v: stats?.users?.faculty ?? "—",
    c: "bg-status-pending/10 text-status-pending",
    e: "👨‍🏫",
  },
  {
    l: "Unread Feedback",
    v: stats?.feedback?.unread ?? "—",
    c: "bg-status-fault/10 text-status-fault",
    e: "💬",
  },
];

  const [glowPos, setGlowPos] = useState<{id: string; x: number; y: number} | null>(null);

  const handleCardMouseMove = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setGlowPos({ id, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleCardMouseLeave = () => setGlowPos(null);

  const top = stats?.topRequestedEquipment ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(s => (
          <div key={s.l} 
            className="bg-card border border-border rounded-xl p-4 text-center relative overflow-hidden"
            onMouseMove={(e) => handleCardMouseMove(s.l, e)}
            onMouseLeave={handleCardMouseLeave}
          >
            {glowPos?.id === s.l && (
              <div
                className="pointer-events-none absolute inset-0 z-0 rounded-xl opacity-60 transition-opacity"
                style={{
                  background: `radial-gradient(300px circle at ${glowPos.x}px ${glowPos.y}px, rgba(100,140,255,0.20), transparent 40%)`,
                }}
              />
            )}
            <div className="relative z-10">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg mx-auto mb-2", s.c)}>{s.e}</div>
              <div className="font-display text-2xl font-bold text-foreground">{s.v}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Top Requested Equipment</h3>
        <div className="space-y-3">
          {top.length === 0 ? (
  <p className="text-sm text-muted-foreground">
    No equipment requests yet.
  </p>
) : (
  top.map((item: any) => {
    const maxRequests = top[0]?.requests || 1;
    const percentage = Math.round(
      (item.requests / maxRequests) * 100
    );

    return (
      <div key={item.equipmentId ?? item.name}>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-foreground flex items-center gap-1.5">
            {(() => { const WidgetIcon = getEquipmentIcon(item.category); return <WidgetIcon className="h-3.5 w-3.5 text-primary flex-shrink-0" />; })()}
            {item.name}
            {item.equipmentId && (
              <span className="text-xs text-muted-foreground font-mono ml-1.5">({item.equipmentId})</span>
            )}
          </span>

          <span className="text-muted-foreground">
            {item.requests} requests
          </span>
        </div>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  })
)}
        </div>
      </div>
    </div>
  );
}

// ─── Students Tab — folder-grouped by semester, with Active/Deactivated toggle ──
const SEMESTER_ORDER = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

function FolderCard({
  folderKey, label, students, teams,
  onRenameFolder, onDeactivate, onDelete, onResetPw, onUpdateSemester, onViewTrustScore,
}: any) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(label);

  const saveLabel = () => {
    const trimmed = draftLabel.trim();
    if (!trimmed) { setDraftLabel(label); setEditing(false); return; }
    if (trimmed !== label) onRenameFolder(folderKey, trimmed);
    setEditing(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/30">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          <Folder className="h-4 w-4 text-primary flex-shrink-0" />
          {editing ? (
            <input
              autoFocus
              value={draftLabel}
              onChange={e => setDraftLabel(e.target.value)}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === "Enter") saveLabel(); if (e.key === "Escape") { setDraftLabel(label); setEditing(false); } }}
              className="text-sm font-semibold bg-background border border-border rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary/40 min-w-0"
            />
          ) : (
            <span className="text-sm font-semibold text-foreground truncate">{label}</span>
          )}
          <span className="text-xs text-muted-foreground flex-shrink-0">({students.length})</span>
        </button>
        {editing ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={(e) => { e.stopPropagation(); saveLabel(); }}
              className="p-1.5 rounded bg-status-available/10 text-status-available hover:bg-status-available hover:text-white transition-colors">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setDraftLabel(label); setEditing(false); }}
              className="p-1.5 rounded bg-muted text-muted-foreground hover:bg-border transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0"
            title="Rename folder">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Department</th><th>Semester</th>
                <th>College</th><th>Active Team</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((u: any) => {
                const team = teams.find((t: any) =>
                  t.active && t.members?.some((m: any) => m.id === u.enrollmentId)
                );
                return (
                  <tr key={u.id}>
                    <td className="font-mono text-xs">{u.enrollmentId}</td>
                    <td>
                      <div className="font-medium">{u.name}</div>
                      {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
                    </td>
                    <td className="text-muted-foreground">{u.department}</td>
                    <td>
                      {/* ✅ NEW — editable inline semester select */}
                      <select
                        value={u.semester ?? ""}
                        onChange={e => onUpdateSemester(u.id, e.target.value)}
                        className="text-xs rounded border border-border bg-background px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <option value="">—</option>
                        {SEMESTER_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="text-xs text-muted-foreground">{u.college}</td>
                    <td>
                      {team
                        ? <span className="team-id-badge text-[10px] py-0.5 px-2">{team.id}</span>
                        : <span className="text-xs text-muted-foreground">None</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => onViewTrustScore?.(u.id)}
                          className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors font-medium flex items-center gap-1">
                          🛡️ Trust
                        </button>
                        <button onClick={() => onResetPw(u.id, u.name)}
                          className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors font-medium">
                          Reset PWD
                        </button>
                        <button onClick={() => onDeactivate(u.id, u.name)}
                          className="text-xs px-2 py-1 rounded bg-status-fault/10 text-status-fault hover:bg-status-fault hover:text-white transition-colors font-medium">
                          Deactivate
                        </button>
                        <button onClick={() => onDelete(u.id, u.name)}
                          className="text-xs px-2 py-1 rounded bg-status-fault/15 text-status-fault hover:bg-status-fault hover:text-white transition-colors font-medium">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr><td colSpan={7} className="text-center py-6 text-muted-foreground text-sm">No students in this folder.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentsTab({
  view, onChangeView,
  students, loading,
  folderLabels, onRenameFolder,
  onAdd, onBulkUpload, onRefresh, teams,
  onDeactivate, onReactivate, onDelete, onResetPw, onUpdateSemester,
  onViewTrustScore,
}: any) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => { setSelected(new Set()); }, [view, students]);

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === students.length) setSelected(new Set());
    else setSelected(new Set(students.map((s: any) => s.id)));
  };

  const bulkAction = async (action: "deactivate" | "reactivate" | "delete") => {
    const ids = [...selected];
    const label = action === "deactivate" ? "Deactivate" : action === "reactivate" ? "Reactivate" : "Permanently delete";
    if (!confirm(`${label} ${ids.length} student${ids.length > 1 ? "s" : ""}?`)) return;
    setBulkLoading(true);
    try {
      for (const id of ids) {
        const s = students.find((u: any) => u.id === id);
        if (!s) continue;
        if (action === "deactivate") await onDeactivate(id, s.name);
        else if (action === "reactivate") await onReactivate(id, s.name);
        else await onDelete(id, s.name);
      }
      setSelected(new Set());
      onRefresh();
    } catch { }
    finally { setBulkLoading(false); }
  };

  // Group active students into folders by semester value
  const folders: { key: string; label: string; students: any[] }[] = [];
  if (view === "active") {
    const byKey: Record<string, any[]> = {};
    for (const s of students) {
      const key = s.semester && s.semester.trim() ? s.semester.trim() : "__unassigned__";
      (byKey[key] ??= []).push(s);
    }
    const knownKeys = Object.keys(byKey).filter(k => k !== "__unassigned__");
    knownKeys.sort((a, b) => {
      const ai = SEMESTER_ORDER.indexOf(a);
      const bi = SEMESTER_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    for (const key of knownKeys) {
      folders.push({ key, label: folderLabels[key] ?? `${key} Semester`, students: byKey[key] });
    }
    if (byKey.__unassigned__) {
      folders.push({ key: "__unassigned__", label: folderLabels.__unassigned__ ?? "Unassigned", students: byKey.__unassigned__ });
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">{students.length} student{students.length === 1 ? "" : "s"}</p>
          {/* ✅ NEW — Active / Deactivated toggle, placed beside Add Student / Bulk Upload */}
          <div className="flex bg-muted/50 border border-border rounded-lg p-0.5">
            <button onClick={() => onChangeView("active")}
              className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                view === "active" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              Active
            </button>
            <button onClick={() => onChangeView("deactivated")}
              className={cn("flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                view === "deactivated" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <UserX className="h-3 w-3" /> Deactivated
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <RefreshCw className="h-3 w-3" />Refresh
          </button>
          {view === "active" && (
            <>
              <button onClick={onBulkUpload}
                className="flex items-center gap-1.5 border border-border px-4 py-2 rounded-lg text-xs font-semibold hover:bg-muted transition-colors">
                <Upload className="h-3.5 w-3.5" />Bulk Upload
              </button>
              <button onClick={onAdd}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">
                <UserPlus className="h-3.5 w-3.5" />Add Student
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl animate-fade-in flex-wrap">
          <span className="text-sm font-semibold text-primary">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            {view === "active" ? (
              <button onClick={() => bulkAction("deactivate")} disabled={bulkLoading}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-status-fault/10 text-status-fault hover:bg-status-fault hover:text-white transition-colors font-medium disabled:opacity-50">
                <UserX className="h-3 w-3" /> Deactivate Selected
              </button>
            ) : (
              <button onClick={() => bulkAction("reactivate")} disabled={bulkLoading}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-status-available/10 text-status-available hover:bg-status-available hover:text-white transition-colors font-medium disabled:opacity-50">
                <RotateCcw className="h-3 w-3" /> Reactivate Selected
              </button>
            )}
            <button onClick={() => bulkAction("delete")} disabled={bulkLoading}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-status-fault/15 text-status-fault hover:bg-status-fault hover:text-white transition-colors font-medium disabled:opacity-50">
              <Trash2 className="h-3 w-3" /> Delete Selected
            </button>
            <button onClick={() => setSelected(new Set())}
              className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…
        </div>
      ) : view === "active" ? (
        // ── Active students — grouped into editable folders by semester ──
        folders.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
            No active students found.
          </div>
        ) : (
          <div className="space-y-3">
            {folders.map(folder => (
              <FolderCard
                key={folder.key}
                folderKey={folder.key}
                label={folder.label}
                students={folder.students}
                teams={teams}
                onRenameFolder={onRenameFolder}
                onDeactivate={onDeactivate}
                onDelete={onDelete}
                onResetPw={onResetPw}
                onUpdateSemester={onUpdateSemester}
                onViewTrustScore={onViewTrustScore}
              />
            ))}
          </div>
        )
      ) : (
        // ── Deactivated students — flat list, reactivate or permanently delete ──
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-8"><input type="checkbox" checked={selected.size === students.length && students.length > 0} onChange={toggleAll} className="rounded border-border" /></th>
                  <th>ID</th><th>Name</th><th>Department</th><th>Semester</th>
                  <th>College</th><th>Deactivated</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((u: any) => (
                  <tr key={u.id} className={cn(selected.has(u.id) && "bg-primary/5")}>
                    <td><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleOne(u.id)} className="rounded border-border" /></td>
                    <td className="font-mono text-xs">{u.enrollmentId}</td>
                    <td>
                      <div className="font-medium">{u.name}</div>
                      {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
                    </td>
                    <td className="text-muted-foreground">{u.department}</td>
                    <td className="text-muted-foreground text-xs">{u.semester ?? "—"}</td>
                    <td className="text-xs text-muted-foreground">{u.college}</td>
                    <td className="text-xs text-muted-foreground">
                      {u.updatedAt ? formatDate(u.updatedAt) : "—"}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => onReactivate(u.id, u.name)}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-status-available/10 text-status-available hover:bg-status-available hover:text-white transition-colors font-medium">
                          <RotateCcw className="h-3 w-3" />Reactivate
                        </button>
                        <button onClick={() => onDelete(u.id, u.name)}
                          className="text-xs px-2 py-1 rounded bg-status-fault/15 text-status-fault hover:bg-status-fault hover:text-white transition-colors font-medium">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No deactivated students.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────
function UsersTab({ users, loading, roleLabel, onAdd, onBulkUpload, onRefresh, teams, onDeactivate, onDelete, onResetPw }: any) {
  const isStudent = roleLabel === "Student";
  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">{users.length} {roleLabel.toLowerCase()}s registered</p>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <RefreshCw className="h-3 w-3" />Refresh
          </button>
          <button onClick={onBulkUpload}
            className="flex items-center gap-1.5 bg-muted text-foreground px-4 py-2 rounded-lg text-xs font-semibold hover:bg-muted/80 transition-colors border border-border">
            <Upload className="h-3.5 w-3.5" />Bulk Upload
          </button>
          <button onClick={onAdd}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">
            <UserPlus className="h-3.5 w-3.5" />Add {roleLabel}
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Name</th><th>Department</th>
                  {isStudent && <th>Semester</th>}
                  <th>College</th>
                  {isStudent && <th>Active Team</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => {
                  const team = teams.find((t: any) =>
                    t.active && t.members?.some((m: any) => m.id === u.enrollmentId)
                  );
                  return (
                    <tr key={u.id}>
                      <td className="font-mono text-xs">{u.enrollmentId}</td>
                      <td>
                        <div className="font-medium flex items-center gap-1.5">
                          {u.name}
                          {/* ✅ Show super admin badge in user list */}
                          {u.canManageAdmins && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                              <ShieldCheck className="h-2.5 w-2.5" /> Super
                            </span>
                          )}
                        </div>
                        {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
                      </td>
                      <td className="text-muted-foreground">{u.department}</td>
                      {isStudent && <td>{u.semester ?? "—"}</td>}
                      <td className="text-xs text-muted-foreground">{u.college}</td>
                      {isStudent && (
                        <td>
                          {team
                            ? <span className="team-id-badge text-[10px] py-0.5 px-2">{team.id}</span>
                            : <span className="text-xs text-muted-foreground">None</span>}
                        </td>
                      )}
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => onResetPw(u.id, u.name)}
                            className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors font-medium">
                            Reset PWD
                          </button>
                          <button onClick={() => onDeactivate(u.id, u.name)}
                            className="text-xs px-2 py-1 rounded bg-status-fault/10 text-status-fault hover:bg-status-fault hover:text-white transition-colors font-medium">
                            Deactivate
                          </button>
                          {/* ✅ NEW — permanent delete, beside Deactivate */}
                          {onDelete && (
                            <button onClick={() => onDelete(u.id, u.name)}
                              className="text-xs px-2 py-1 rounded bg-status-fault/15 text-status-fault hover:bg-status-fault hover:text-white transition-colors font-medium">
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No {roleLabel.toLowerCase()}s found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}