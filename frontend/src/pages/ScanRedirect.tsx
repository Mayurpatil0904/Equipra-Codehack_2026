// frontend/src/pages/ScanRedirect.tsx
//
// Landing page for the collection-pass QR code: /scan/:token
//
// Flow:
//   1. Not logged in → ProtectedRoute bounces to /login, remembering
//      this URL via location state. After login, the user lands
//      right back here.
//   2. Logged-in STUDENT  → sees their OWN collection pass (read-only),
//      same component as on My Requests.
//   3. Logged-in ADMIN    → sees the request's full status. If it's
//      still out, a "Process Return / Check-In" button opens the
//      Return Inspection modal. If it's already been returned, shows
//      the recorded condition/damage info instead.
//   4. Logged-in FACULTY  → read-only summary (their verified request).
//   5. Anyone viewing a pass that isn't theirs → friendly "not yours"
//      message (backend returns 403).

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Loader2, QrCode, AlertTriangle, ShieldAlert,
  CheckCircle2, Star, Calendar, MapPin, User, Hash, History, PackageCheck,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { requestsApi } from "@/lib/api";
import { ReturnInspectionModal } from "@/components/ReturnInspectionModal";
import { CollectionPass } from "@/components/CollectionPass";
import { StatusBadge } from "@/components/StatusBadge";
import { getEquipmentIcon } from "@/lib/equipmentIcons";

const CONDITION_LABELS: Record<number, string> = {
  5: "Excellent",
  4: "Good",
  3: "Fair — sent for inspection",
  2: "Damaged",
  1: "Faulty",
};

export default function ScanRedirect() {
  const { token } = useParams<{ token: string }>();
  const { role } = useApp();
  const navigate = useNavigate();

  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState<string | null>(null);
  const [request, setRequest]   = useState<any>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const load = () => {
    if (!token) { setError("Missing QR token."); setLoading(false); return; }
    setLoading(true);
    requestsApi.getByQr(token)
      .then(r => { setRequest(r); setError(null); })
      .catch((e: any) => setError(e.message ?? "This collection pass could not be found."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container py-24 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Looking up collection pass…</p>
      </div>
    );
  }

  // ── Error / not found / not yours ───────────────────────────────
  if (error || !request) {
    return (
      <div className="container py-16 max-w-md mx-auto text-center">
        <div className="w-14 h-14 rounded-2xl bg-status-fault/10 flex items-center justify-center mx-auto mb-4">
          {error?.toLowerCase().includes("belong") || error?.toLowerCase().includes("access")
            ? <ShieldAlert className="h-7 w-7 text-status-fault" />
            : <AlertTriangle className="h-7 w-7 text-status-fault" />}
        </div>
        <h1 className="font-display text-xl font-bold text-foreground mb-2">
          {error?.toLowerCase().includes("belong") || error?.toLowerCase().includes("access")
            ? "Not Your Collection Pass"
            : "QR Code Not Recognized"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {error ?? "This QR code doesn't match any active request."}
        </p>
        <Link
          to={role === "admin" ? "/admin" : role === "faculty" ? "/faculty" : "/my-requests"}
          className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Go to {role === "admin" ? "Admin Dashboard" : role === "faculty" ? "Faculty Dashboard" : "My Requests"}
        </Link>
      </div>
    );
  }

  const equipment = request.equipment ?? {};
  const isReturned = request.status === "returned" || request.status === "returned_pending_inspection";
  const EquipmentIcon = getEquipmentIcon(equipment.category);

  // ════════════════════════════════════════════════════════════
  // STUDENT VIEW — their own collection pass (read-only)
  // ════════════════════════════════════════════════════════════
  if (role === "student") {
    return (
      <div className="container py-10 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <EquipmentIcon className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display text-lg font-bold text-foreground">
            {equipment.name ?? "Equipment"}
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{request.requestCode}</p>
        </div>

        {request.status === "approved" ? (
          <CollectionPass request={request} />
        ) : (
          <div className="bg-card border border-border rounded-xl p-5 text-center space-y-2">
            <StatusBadge type="request" status={request.status} />
            <p className="text-sm text-muted-foreground">
              {isReturned
                ? "This item has already been returned. Thanks!"
                : "This request isn't in a collectable state right now."}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // FACULTY VIEW — read-only summary
  // ════════════════════════════════════════════════════════════
  if (role === "faculty") {
    return (
      <div className="container py-10 max-w-lg mx-auto">
        <RequestSummaryCard request={request} />
        <div className="mt-6 text-center">
          <Link to="/faculty" className="text-sm text-primary font-medium hover:underline">
            ← Back to Faculty Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ADMIN VIEW — full details + return action
  // ════════════════════════════════════════════════════════════
  return (
    <div className="container py-10 max-w-lg mx-auto">
      <RequestSummaryCard request={request} showDetails />

      {isReturned ? (
        <div className="mt-4 bg-status-available/8 border border-status-available/25 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-status-available flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-status-available">Already returned</p>
            {request.conditionRating != null && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Star className="h-3 w-3" /> Condition: {CONDITION_LABELS[request.conditionRating] ?? request.conditionRating}
              </p>
            )}
            {request.damageNotes && (
              <p className="text-xs text-muted-foreground mt-1">Notes: {request.damageNotes}</p>
            )}
            {request.returnedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Returned {new Date(request.returnedAt).toLocaleString("en-IN")}
              </p>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowReturnModal(true)}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <QrCode className="h-4 w-4" />
          Process Return / Check-In
        </button>
      )}

      {/* ✅ NEW — This student's past issued items + the condition
          each was returned in. Lets the admin spot repeat damage or
          a student who consistently returns items in poor shape. */}
      <StudentHistorySection
        studentName={request.student?.name}
        history={request.studentHistory ?? []}
      />

      <div className="mt-4 text-center">
        <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Admin Dashboard
        </Link>
      </div>

      {showReturnModal && (
        <ReturnInspectionModal
          request={request}
          onClose={() => setShowReturnModal(false)}
          onDone={() => { setShowReturnModal(false); load(); }}
        />
      )}
    </div>
  );
}

// ── Shared summary card (admin + faculty views) ──────────────────
function RequestSummaryCard({ request, showDetails }: { request: any; showDetails?: boolean }) {
  const equipment = request.equipment ?? {};
  const student = request.student ?? {};
  const EquipmentIcon = getEquipmentIcon(equipment.category);

  const fromDate = request.dateFrom
    ? new Date(request.dateFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "N/A";
  const toDate = request.dateTo
    ? new Date(request.dateTo).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "N/A";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="bg-primary px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-primary-foreground/70 uppercase tracking-widest">
            Equipra · Collection Pass
          </p>
          <p className="text-white font-bold text-lg mt-0.5">{equipment.name ?? "Equipment"}</p>
        </div>
        <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
          <EquipmentIcon className="h-7 w-7 text-white" />
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Hash className="h-4 w-4" /> Request Code
          </div>
          <span className="font-mono font-bold text-lg text-foreground tracking-wider">
            {request.requestCode ?? "N/A"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge type="request" status={request.status} />
          {equipment.equipmentId && (
            <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {equipment.equipmentId}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
              <User className="h-3 w-3" /> Student
            </div>
            <p className="text-foreground font-medium">
              {student.name ?? "—"}{student.enrollmentId ? ` · ${student.enrollmentId}` : ""}
            </p>
          </div>

          {showDetails && (
            <div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                <MapPin className="h-3 w-3" /> Lab Location
              </div>
              <p className="text-foreground font-medium">{equipment.labLocation ?? "—"}</p>
            </div>
          )}

          <div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
              <Calendar className="h-3 w-3" /> From
            </div>
            <p className="text-foreground font-medium">{fromDate}</p>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
              <Calendar className="h-3 w-3" /> Return By
            </div>
            <p className="text-foreground font-medium">{toDate}</p>
          </div>
        </div>

        {request.project && (
          <div>
            <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Project</div>
            <p className="text-sm text-foreground">{request.project}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Student's past issued items + return condition (admin-only) ──
function StudentHistorySection({
  studentName,
  history,
}: {
  studentName?: string;
  history: any[];
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">
          {studentName ? `${studentName}'s` : "Student"} Past Issued Items
        </h2>
      </div>

      {history.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <PackageCheck className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-xs text-muted-foreground">
            No previous equipment requests on record.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
          {history.map((h) => {
            const equipment = h.equipment ?? {};
            const HistoryIcon = getEquipmentIcon(equipment.category);
            const isReturnedItem =
              h.status === "returned" || h.status === "returned_pending_inspection";

            const fromDate = h.dateFrom
              ? new Date(h.dateFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : null;
            const toDate = h.dateTo
              ? new Date(h.dateTo).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : null;

            return (
              <div key={h.id} className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <HistoryIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {equipment.name ?? "Equipment"}
                        {equipment.equipmentId && (
                          <span className="ml-1.5 font-mono text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
                            {equipment.equipmentId}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {h.requestCode}
                        {fromDate && toDate && <> · {fromDate} → {toDate}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge type="request" status={h.status} />
                  </div>
                </div>

                {/* Return condition — only shown for items that have come back */}
                {isReturnedItem && (
                  <div className="mt-2 ml-9 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {h.conditionRating != null && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {CONDITION_LABELS[h.conditionRating] ?? h.conditionRating}
                      </span>
                    )}
                    {h.damageNotes && <span>Notes: {h.damageNotes}</span>}
                    {h.damagePercent != null && h.damagePercent > 0 && (
                      <span>{h.damagePercent}% damage</span>
                    )}
                    {h.returnedAt && (
                      <span>
                        Returned {new Date(h.returnedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
