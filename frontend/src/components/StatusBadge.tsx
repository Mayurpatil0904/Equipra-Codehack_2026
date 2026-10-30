// frontend/src/components/StatusBadge.tsx
// FIX: Added underscore variants (not_scanned, fault_detected etc.)
// DB stores underscore format but old code only had hyphen format
// This caused cfg = undefined → cfg.icon CRASH → blank white page

import {
  CheckCircle2, Clock, XCircle, Wrench, CircleDot, Search, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatusBadgeProps =
  | { type: "availability"; status: string; className?: string }
  | { type: "fault";        status: string; className?: string }
  | { type: "request";      status: string; className?: string };

const availConfig: Record<string, { label: string; icon: any; cls: string }> = {
  available:   { label: "Available",         icon: CheckCircle2, cls: "bg-status-available/10 text-status-available border-status-available/25" },
  issued:      { label: "Issued",            icon: CircleDot,    cls: "bg-status-issued/10 text-status-issued border-status-issued/25" },
  reserved:    { label: "Reserved",          icon: Clock,        cls: "bg-status-pending/10 text-status-pending border-status-pending/25" },
  maintenance: { label: "Under Maintenance", icon: Wrench,          cls: "bg-status-maintenance/10 text-status-maintenance border-status-maintenance/25" },
  inspection:  { label: "Inspection Hold",   icon: AlertTriangle,   cls: "bg-status-pending/10 text-status-pending border-status-pending/25" },
};

const faultConfig: Record<string, { label: string; icon: any; cls: string }> = {
  // ✅ UNDERSCORE — what PostgreSQL / Prisma actually stores
  "not_scanned":       { label: "Not Yet Scanned",           icon: Clock,        cls: "bg-muted text-muted-foreground border-border" },
  "scanned_ok_before": { label: "Scanned Before Issue — OK", icon: CheckCircle2, cls: "bg-status-available/10 text-status-available border-status-available/25" },
  "scanned_ok_after":  { label: "Scanned After Return — OK", icon: CheckCircle2, cls: "bg-status-available/10 text-status-available border-status-available/25" },
  "fault_detected":    { label: "Fault Detected",            icon: XCircle,      cls: "bg-status-fault/10 text-status-fault border-status-fault/25" },
  "fault_evaluation":  { label: "Fault Under Evaluation",    icon: Search,       cls: "bg-status-pending/10 text-status-pending border-status-pending/25" },
  // ✅ HYPHEN — kept for any legacy hardcoded values
  "not-scanned":       { label: "Not Yet Scanned",           icon: Clock,        cls: "bg-muted text-muted-foreground border-border" },
  "scanned-ok-before": { label: "Scanned Before Issue — OK", icon: CheckCircle2, cls: "bg-status-available/10 text-status-available border-status-available/25" },
  "scanned-ok-after":  { label: "Scanned After Return — OK", icon: CheckCircle2, cls: "bg-status-available/10 text-status-available border-status-available/25" },
  "fault-detected":    { label: "Fault Detected",            icon: XCircle,      cls: "bg-status-fault/10 text-status-fault border-status-fault/25" },
  "fault-evaluation":  { label: "Fault Under Evaluation",    icon: Search,       cls: "bg-status-pending/10 text-status-pending border-status-pending/25" },
};

const reqConfig: Record<string, { label: string; icon: any; cls: string }> = {
  pending_faculty: { label: "Awaiting Faculty",   icon: Clock,        cls: "bg-status-pending/10 text-status-pending border-status-pending/25" },
  pending_lab:     { label: "Awaiting Lab Asst.", icon: Clock,        cls: "bg-status-issued/10 text-status-issued border-status-issued/25" },
  approved:        { label: "Approved",           icon: CheckCircle2, cls: "bg-status-available/10 text-status-available border-status-available/25" },
  rejected:        { label: "Rejected",           icon: XCircle,      cls: "bg-status-fault/10 text-status-fault border-status-fault/25" },
  issued:          { label: "Issued",             icon: CircleDot,    cls: "bg-status-issued/10 text-status-issued border-status-issued/25" },
  returned:        { label: "Returned",           icon: CheckCircle2,   cls: "bg-muted text-muted-foreground border-border" },
  returned_pending_inspection: { label: "Pending Inspection", icon: AlertTriangle, cls: "bg-status-pending/10 text-status-pending border-status-pending/25" },
};

// ✅ Safe fallback — if DB ever returns an unexpected value, never crash
const FALLBACK = { label: "Unknown", icon: Clock, cls: "bg-muted text-muted-foreground border-border" };

export function StatusBadge({ type, status, className }: StatusBadgeProps) {
  // ✅ Guard: null / undefined status → render nothing instead of crashing
  if (!status) return null;

  const cfg =
    type === "availability" ? (availConfig[status] ?? FALLBACK) :
    type === "fault"        ? (faultConfig[status] ?? FALLBACK) :
    (reqConfig[status]      ?? FALLBACK);

  const Icon = cfg.icon;
  return (
    <span className={cn("status-pill", cfg.cls, className)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}
