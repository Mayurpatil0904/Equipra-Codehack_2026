import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { User, Lock, Loader2, CheckCircle2, Eye, EyeOff, ShieldCheck, Zap, Award, Sparkles, HelpCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { authApi, trustScoreApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TrustScoreBadge } from "@/components/TrustScoreBadge";
import { TrustScoreModal } from "@/components/TrustScoreModal";

export default function Profile() {
  const { user, role, logout } = useApp();
  const navigate = useNavigate();

  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showCur,    setShowCur]    = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [trustData,  setTrustData]  = useState<any>(null);
  const [showTrustModal, setShowTrustModal] = useState(false);

  useEffect(() => {
    if (role === "student") {
      trustScoreApi.getMine().then(setTrustData).catch(() => {});
    }
  }, [role]);

  const pwStrength = (p: string) => {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6)  s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };

  const strength = pwStrength(newPw);
  const strengthLabel = ["", "Weak", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-status-fault", "bg-status-fault", "bg-status-issued", "bg-status-available", "bg-status-available"][strength];

  const handleChangePassword = async () => {
    if (!currentPw)          { toast.error("Please enter your current password."); return; }
    if (!newPw)              { toast.error("Please enter a new password."); return; }
    if (newPw.length < 6)    { toast.error("New password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { toast.error("Passwords do not match."); return; }
    if (newPw === currentPw) { toast.error("New password must be different from current password."); return; }

    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword: currentPw, newPassword: newPw });
      setSuccess(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      toast.success("Password changed successfully! Please log in again.");
      setTimeout(() => { logout(); navigate("/login"); }, 2000);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  const roleDisplay: Record<string, string> = {
    student: "Student",
    faculty: "Faculty",
    admin:   "Admin / Lab Assistant",
  };

  const roleColor: Record<string, string> = {
    student: "bg-status-available/10 text-status-available border-status-available/25",
    faculty: "bg-status-pending/10 text-status-pending border-status-pending/25",
    admin:   "bg-status-maintenance/10 text-status-maintenance border-status-maintenance/25",
  };

  return (
    <>
      <section className="bg-muted/30 border-b border-border py-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="container">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">My Profile</h1>
            <p className="text-muted-foreground">Manage your account information and security settings.</p>
          </div>
        </motion.div>
      </section>

      <div className="container py-8 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Left — account info */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold mx-auto mb-4">
                {user?.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <h2 className="font-semibold text-foreground text-lg">{user?.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{user?.department}</p>
              <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mt-3", roleColor[role ?? "student"])}>
                {roleDisplay[role ?? "student"]}
              </div>
            </div>

            {/* Student Accountability Passport Card */}
            {role === "student" && (
              <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-border rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Trust Score
                  </span>
                  <button
                    onClick={() => setShowTrustModal(true)}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Details →
                  </button>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold font-display text-foreground">
                      {trustData?.score ?? 75}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">/ 100</span>
                  </div>
                  <TrustScoreBadge
                    score={trustData?.score ?? 75}
                    tier={trustData?.tier ?? "SILVER"}
                    isPriorityPass={trustData?.isPriorityPass}
                    size="sm"
                    showScore={false}
                  />
                </div>

                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                      (trustData?.score ?? 75) >= 90
                        ? "from-purple-500 to-indigo-500"
                        : (trustData?.score ?? 75) >= 75
                        ? "from-amber-500 to-orange-500"
                        : "from-blue-500 to-cyan-500"
                    )}
                    style={{ width: `${Math.min(100, trustData?.score ?? 75)}%` }}
                  />
                </div>

                <div className="pt-1 text-[11px] text-muted-foreground flex justify-between items-center">
                  <span>On-time Rate: <strong className="text-foreground">{trustData?.stats?.onTimeRate ?? 100}%</strong></span>
                  <span>Limit: <strong className="text-primary">{trustData?.maxConcurrentItems ?? 2} items</strong></span>
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Account Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Enrollment ID</span>
                  <span className="font-mono font-medium text-foreground">{user?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">College</span>
                  <span className="font-medium text-foreground text-right max-w-[150px]">{user?.college}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium text-foreground text-right max-w-[150px]">{user?.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium text-foreground capitalize">{role}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — change password */}
          <div className="md:col-span-2">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-5">
                <Lock className="h-4 w-4 text-primary" /> Change Password
              </h3>

              {success ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle2 className="h-12 w-12 text-status-available mb-3" />
                  <p className="font-semibold text-foreground">Password changed!</p>
                  <p className="text-sm text-muted-foreground mt-1">Redirecting to login…</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Current password */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Current Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showCur ? "text" : "password"}
                        value={currentPw}
                        onChange={e => setCurrentPw(e.target.value)}
                        placeholder="Enter your current password"
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCur(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New password */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {/* Strength meter */}
                    {newPw && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-200",
                              i <= strength ? strengthColor : "bg-muted")} />
                          ))}
                        </div>
                        <p className={cn("text-xs font-medium",
                          strength <= 2 ? "text-status-fault" :
                          strength === 3 ? "text-status-issued" : "text-status-available")}>
                          {strengthLabel}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleChangePassword()}
                      placeholder="Repeat new password"
                      className={cn(
                        "w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40",
                        confirmPw && newPw !== confirmPw
                          ? "border-status-fault/60"
                          : "border-border"
                      )}
                    />
                    {confirmPw && newPw !== confirmPw && (
                      <p className="text-xs text-status-fault mt-1">Passwords do not match</p>
                    )}
                  </div>

                  {/* Tips */}
                  <div className="bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground mb-2">Password tips:</p>
                    <p className={cn(newPw.length >= 6 ? "text-status-available" : "")}>• At least 6 characters</p>
                    <p className={cn(/[A-Z]/.test(newPw) ? "text-status-available" : "")}>• At least one uppercase letter</p>
                    <p className={cn(/[0-9]/.test(newPw) ? "text-status-available" : "")}>• At least one number</p>
                    <p className={cn(/[^A-Za-z0-9]/.test(newPw) ? "text-status-available" : "")}>• At least one special character</p>
                  </div>

                  <button
                    onClick={handleChangePassword}
                    disabled={saving}
                    className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Changing Password…</> : "Change Password"}
                  </button>
                </div>
              )}
            </div>

            {/* Danger zone */}
            <div className="mt-4 bg-card border border-status-fault/20 rounded-xl p-5">
              <h3 className="font-semibold text-status-fault text-sm mb-3">Account Actions</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Logging out will end your current session. You'll need to sign in again to access the platform.
              </p>
              <button
                onClick={() => { logout(); navigate("/login"); }}
                className="px-5 py-2 rounded-lg bg-status-fault/10 text-status-fault border border-status-fault/25 text-sm font-semibold hover:bg-status-fault hover:text-white transition-colors duration-200"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {showTrustModal && (
        <TrustScoreModal
          onClose={() => setShowTrustModal(false)}
        />
      )}
    </>
  );
}
