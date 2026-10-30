import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  User,
  Calendar,
  CheckCircle2,
  Loader2,
  QrCode,
  Sparkles,
  Building2,
  Clock,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { EquipmentQRCode } from "@/components/EquipmentQRCode";
import { equipmentApi } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { getEquipmentIcon } from "@/lib/equipmentIcons";
import { hardwareData } from "@/data/hardwareData";

const dotCls: Record<string, string> = {
  success: "bg-status-available",
  pending: "bg-status-pending",
  warning: "bg-status-issued",
  error:   "bg-status-fault",
};

export default function HardwareDetail() {
  const { id }       = useParams<{ id: string }>();
  const { role }     = useApp();
  const navigate     = useNavigate();
  const [item,    setItem]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showQR, setShowQR]   = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    equipmentApi.get(id)
      .then((data) => {
        if (data) {
          setItem(data);
          setNotFound(false);
        } else {
          throw new Error("Empty response");
        }
      })
      .catch(() => {
        // Resilient fallback to local hardwareData
        const found = hardwareData.find((h: any) => h.slug === id || h.id === id);
        if (found) {
          setItem(found);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (notFound || !item) return (
    <div className="container py-20 text-center">
      <h1 className="font-display text-2xl font-bold mb-4">Resource Not Found</h1>
      <p className="text-muted-foreground mb-6">The item or facility slot you're looking for doesn't exist or has been relocated.</p>
      <Link to="/inventory" className="text-primary font-medium hover:underline flex items-center gap-1 justify-center">
        <ArrowLeft className="h-4 w-4" /> Back to Catalog
      </Link>
    </div>
  );

  // Normalise fields — backend uses supervisorName, frontend used supervisor
  const supervisor  = item.supervisorName ?? item.supervisor ?? "—";
  const typicalUses = item.typicalUses ?? [];
  const timeline    = item.timeline    ?? [];
  const faultStatus = item.faultScanStatus ?? (item.faultScans?.[0]?.result === "ok" ? "scanned-ok-after" : "not-scanned");
  const Icon         = getEquipmentIcon(item.category);
  const itemKey      = item.slug ?? item.id;

  const isCrossLabBundle = item.category === "Cross-Lab Bundles";
  const isSharedSpace    = item.category === "Shared Spaces & Benches";
  const isWaitlisted     = item.availabilityStatus === "issued" || item.availableUnits === 0;

  return (
    <motion.div
      className="container py-8 max-w-5xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border-none bg-none">
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </button>
        <button onClick={() => setShowQR(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted/50 transition-colors">
          <QrCode className="h-3.5 w-3.5" />QR Code
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="aspect-square rounded-2xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/50 flex items-center justify-center select-none overflow-hidden relative">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <Icon className="h-28 w-28 text-primary/70" strokeWidth={1.5} />
            )}

            {isCrossLabBundle && (
              <span className="absolute top-3 right-3 text-[10px] font-semibold text-foreground bg-background/90 border border-border rounded-md px-2 py-0.5 backdrop-blur-sm flex items-center gap-1 shadow-xs">
                <Sparkles className="h-3 w-3 text-muted-foreground" />
                Cross-Lab
              </span>
            )}
            {isSharedSpace && (
              <span className="absolute top-3 right-3 text-[10px] font-semibold text-foreground bg-background/90 border border-border rounded-md px-2 py-0.5 backdrop-blur-sm flex items-center gap-1 shadow-xs">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                Shared Space
              </span>
            )}
          </div>

          {typicalUses.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-4 shadow-xs">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {isSharedSpace ? "Testing Capabilities" : "Typical Applications"}
              </p>
              <div className="space-y-2">
                {typicalUses.map((u: string) => (
                  <div key={u} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    <span>{u}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-muted/30 rounded-2xl border border-border p-4 text-xs space-y-2">
            <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground block">
              Institutional Governance
            </span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Full Audit Trail & QR Pass Verification</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
              <span>24h Mandatory Inspection Holding Buffer</span>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {item.category}
            </span>
            {isCrossLabBundle && (
              <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                Dual-Lab Co-Supervised Kit
              </span>
            )}
            {isSharedSpace && (
              <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                Bookable Facility / Bay
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1 leading-snug">
            {item.name}
          </h1>

          <p className="text-xs font-mono text-muted-foreground mb-4">
            {item.equipmentId
              ? <>Resource ID: <span className="font-semibold text-foreground">{item.equipmentId}</span></>
              : <span className="text-muted-foreground/60">ID: {itemKey}</span>}
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-5">
            <StatusBadge type="availability" status={item.availabilityStatus} />
            <StatusBadge type="fault" status={faultStatus} />
            {isWaitlisted && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                <Clock className="h-3.5 w-3.5" />
                Waitlist Active (Queue Position #1)
              </span>
            )}
          </div>

          <p className="text-muted-foreground leading-relaxed mb-6 text-sm">
            {item.description}
          </p>

          {/* Cross-Lab Bundle Card */}
          {isCrossLabBundle && (
            <div className="p-4 rounded-xl border border-border bg-card mb-6 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-foreground" />
                <span className="font-semibold text-sm text-foreground">
                  Pooled Multi-Department Package
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This collaborative bundle pools specialized instruments across multiple departments. Requisition is automatically routed for dual-endorsement by both lab heads before release.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Co-Hosting Departments:</span>
                  <span className="font-semibold text-foreground">{item.labLocation}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Dual Incharges:</span>
                  <span className="font-semibold text-foreground">{supervisor}</span>
                </div>
              </div>
            </div>
          )}

          {/* Shared Space Card */}
          {isSharedSpace && (
            <div className="p-4 rounded-xl border border-border bg-card mb-6 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-foreground" />
                <span className="font-semibold text-sm text-foreground">
                  Dedicated Testing Station & Bay Allocation
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Clean test space equipped with specialized safety interlocks, vibration-isolated fixtures, and laboratory instrumentation. Reserving provides verified project teams scheduled access.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Testing Bay Location:</span>
                  <span className="font-semibold text-foreground">{item.labLocation}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Station Supervisor:</span>
                  <span className="font-semibold text-foreground">{supervisor}</span>
                </div>
              </div>
            </div>
          )}

          {/* Waitlist Warning Card */}
          {isWaitlisted && (
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 mb-6 flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-amber-600 dark:text-amber-400">
                  Resource Currently In Use (Active Queue)
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Currently checked out by student team until {item.returnDate || "scheduled return date"}. Joining the waitlist registers your project next in line.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 bg-card rounded-2xl border border-border p-4 text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Location:</span>
              <span className="font-semibold text-foreground truncate">{item.labLocation}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Supervisor:</span>
              <span className="font-semibold text-foreground truncate">{supervisor}</span>
            </div>
            {item.lastIssuedTo && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Current User:</span>
                <span className="font-mono text-foreground truncate">{item.lastIssuedTo}</span>
              </div>
            )}
            {item.returnDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Expected Return:</span>
                <span className="font-semibold text-foreground">{item.returnDate}</span>
              </div>
            )}
          </div>

          {item.conditionLog && (
            <div className="bg-muted/40 rounded-xl px-4 py-3 text-xs text-muted-foreground mb-6 border border-border/50">
              <span className="font-semibold text-foreground">Condition Audit: </span>{item.conditionLog}
            </div>
          )}

          {/* Action Button */}
          {role === "student" && (
            <Link
              to={`/request?item=${itemKey}`}
              className={cn(
                "inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all mb-6 w-full sm:w-auto text-center shadow-xs",
                isWaitlisted
                  ? "border border-border bg-card text-foreground hover:bg-muted"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isWaitlisted
                ? "Join Priority Waitlist (Queue #1) →"
                : isCrossLabBundle
                ? "Request Cross-Lab Kit Bundle →"
                : isSharedSpace
                ? "Book Facility Testing Slot →"
                : "Request This Equipment →"}
            </Link>
          )}

          {/* Usage Timeline */}
          {timeline.length > 0 && (
            <div className="pt-2 border-t border-border/60">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-foreground text-sm">Auditable Lifecycle Log</p>
                {item.equipmentId && (
                  <Link
                    to={`/fault-scan?id=${item.equipmentId}`}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    View optical scan records →
                  </Link>
                )}
              </div>
              <div className="space-y-0">
                {timeline.map((entry: any, i: number) => (
                  <div key={i} className="flex gap-4 pb-4 last:pb-0 relative">
                    {i < timeline.length - 1 && (
                      <div className="absolute left-3 top-6 w-0.5 h-full bg-border" />
                    )}
                    <div className={cn("w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center z-10 mt-0.5", dotCls[entry.status] ?? "bg-muted")}>
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    <div>
                      <p className="text-xs text-foreground font-medium">{entry.description}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {entry.date ?? new Date(entry.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {showQR && <EquipmentQRCode slug={itemKey} name={item.name} equipmentId={item.equipmentId} onClose={() => setShowQR(false)} />}
    </motion.div>
  );
}
