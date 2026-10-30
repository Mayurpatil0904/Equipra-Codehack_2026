import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Scale,
  X,
  Sparkles,
  Building2,
  Activity,
  ShieldCheck,
  QrCode,
  Users,
  ChevronRight,
  ExternalLink,
  Layers,
  Award,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function JudgeDemoWidget() {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const { user, role, login } = useApp();
  const navigate = useNavigate();

  const handleRoleSwitch = async (
    enrollmentId: string,
    pass: string,
    targetRole: string,
    name: string
  ) => {
    setSwitching(true);
    try {
      await login(enrollmentId, pass, "Parul University", targetRole);
      toast.success(`Switched to ${name} (${targetRole})`);
    } catch (err: any) {
      toast.error(err.message || "Failed to switch role. Is the backend running?");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <>
      {/* Floating Pill Trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-6 z-[190] flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-amber-500 text-white font-bold text-xs shadow-xl hover:bg-amber-600 hover:scale-105 active:scale-95 transition-all border border-amber-400/40 group"
          title="Open Hackathon Judge Evaluation Panel"
        >
          <Scale className="h-4 w-4 transition-transform group-hover:rotate-12" />
          <span className="tracking-wide">Judge Assistant</span>
          <span className="h-2 w-2 rounded-full bg-white animate-ping ml-0.5" />
        </button>
      )}

      {/* Floating Evaluation Drawer */}
      {open && (
        <div className="fixed bottom-6 left-4 sm:left-6 z-[250] w-[calc(100vw-2rem)] sm:w-[420px] max-h-[85vh] bg-card border border-amber-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-amber-500" />
              <span className="font-bold text-xs text-foreground tracking-wide">Judge Assistant</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto space-y-4 text-xs">
            {/* 1. Quick Role Switcher */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3 text-amber-500" />
                  1-Click Role Switcher
                </span>
                <span className="text-[10px] text-primary font-semibold">
                  Active: {user ? `${user.name} (${user.role})` : "Not logged in"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={switching}
                  onClick={() =>
                    handleRoleSwitch("PU-STU-001", "student123", "student", "Aditya (Student)")
                  }
                  className={cn(
                    "p-2 rounded-xl border text-left transition-all flex flex-col justify-between",
                    role === "student"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-sm">🎓</span>
                  <span className="font-semibold text-[11px] mt-1">Student</span>
                  <span className="text-[9px] opacity-75">Req & QR</span>
                </button>

                <button
                  type="button"
                  disabled={switching}
                  onClick={() =>
                    handleRoleSwitch("PU-FAC-001", "faculty123", "faculty", "Prof. Patel (Faculty)")
                  }
                  className={cn(
                    "p-2 rounded-xl border text-left transition-all flex flex-col justify-between",
                    role === "faculty"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-sm">👨‍🏫</span>
                  <span className="font-semibold text-[11px] mt-1">Faculty</span>
                  <span className="text-[9px] opacity-75">1st Review</span>
                </button>

                <button
                  type="button"
                  disabled={switching}
                  onClick={() =>
                    handleRoleSwitch("PU-ADM-001", "admin123", "admin", "Prof. Mehta (Admin)")
                  }
                  className={cn(
                    "p-2 rounded-xl border text-left transition-all flex flex-col justify-between",
                    role === "admin"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-sm">🛠️</span>
                  <span className="font-semibold text-[11px] mt-1">Lab Admin</span>
                  <span className="text-[9px] opacity-75">Issuance Desk</span>
                </button>
              </div>
            </div>

            {/* 2. Direct Feature Links */}
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground block mb-2">
                Core Hackathon Challenge Journeys
              </span>
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    navigate("/inventory?cat=Cross-Lab+Bundles");
                    setOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-left flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                        Cross-Lab Bundles (Multi-Dept Kits)
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Dual supervision kits pooled between ECE & Mechatronics
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => {
                    navigate("/inventory?cat=Shared+Spaces+%26+Benches");
                    setOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 text-left flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground text-xs">
                        Shared Spaces & Testing Benches
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Optical darkroom, UAV cage, SMD soldering station booking
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => {
                    navigate("/hardware/vibrometer-laser-optics");
                    setOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-left flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-rose-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground text-xs">
                        Live Vibrometer IoT Telemetry
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Real-time canvas waveform & vibration amplitude stream
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </button>

                <button
                  onClick={() => {
                    navigate("/admin");
                    setOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-left flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground text-xs">
                        Requisition Desk & Audit Log
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Approve, inspect, and track complete equipment lifecycle
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => {
                    navigate("/fault-scan");
                    setOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-left flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-blue-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground text-xs">
                        Fault Scanner & Return Audit
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Optical verification of pin wear & damage reporting
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* 3. Fair-Access & Allocation Architecture */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px]">
                <Award className="h-3.5 w-3.5 text-amber-500" />
                Fair-Access Allocation Highlights
              </div>
              <ul className="text-[10px] text-muted-foreground space-y-1 list-disc pl-4">
                <li><strong className="text-foreground">Transparent Waitlist:</strong> Queue position & automated release when prior user returns.</li>
                <li><strong className="text-foreground">24h Holding Window:</strong> Mandatory inspection buffer preventing unauthorized direct handovers.</li>
                <li><strong className="text-foreground">Anti-Monopolisation:</strong> Hard limit of 2 concurrent high-demand devices per student.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
