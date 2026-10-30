// frontend/src/pages/LabAnalytics.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, BarChart3, TrendingUp, AlertTriangle, Clock,
  RefreshCw, Loader2, Users, Cpu, Activity, Wifi, WifiOff,
  Zap, Lightbulb, Eye, Boxes, PieChart, Layers, ChevronRight,
  Package, Trophy, Building2, Server, ThermometerSun, Gauge,
} from "lucide-react";
import { GenerateButton } from "@/components/effects/GenerateButton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RePie, Pie, Cell, Legend,
} from "recharts";
import { labAnalyticsApi, aiApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";

const PIE_COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", color)} />
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function LabAnalytics() {
  const [overview, setOverview] = useState<any>(null);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [typeData, setTypeData] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const { role } = useApp();
  const isAdmin = role === "admin";

  const loadInsights = async () => {
    setInsightsLoading(true);
    try {
      const data = await aiApi.labInsights();
      setInsights(data.insights ?? []);
    } catch (e: any) { console.error("AI insights failed:", e.message); }
    finally { setInsightsLoading(false); }
  };

  useEffect(() => {
    (async () => {
      try {
        const [ov, dept, tp, tl, dev] = await Promise.all([
          labAnalyticsApi.overview(),
          labAnalyticsApi.byDepartment(),
          labAnalyticsApi.byType(),
          labAnalyticsApi.activityTimeline(20),
          labAnalyticsApi.deviceHealth(),
        ]);
        setOverview(ov);
        setDeptData(dept);
        setTypeData(tp);
        setTimeline(tl);
        setDevices(dev);
      } catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading lab analytics…
    </div>
  );

  if (!overview) return null;

  const pieData = typeData ? [
    { name: "Hardware", value: typeData.hardware },
    { name: "Software", value: typeData.software },
    { name: "Hybrid",   value: typeData.hybrid },
  ].filter(d => d.value > 0) : [];

  return (
    <>
      {/* Header */}
      <section className="bg-muted/30 border-b border-border py-8">
        <div className="container">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-primary" />
            <div>
              <h1 className="font-display text-2xl font-bold">Lab Analytics</h1>
              <p className="text-sm text-muted-foreground">Cross-project insights &amp; IoT platform metrics</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard icon={Boxes} label="Total Projects" value={overview.projects.total} sub={`${overview.projects.active} active`} color="text-primary" />
          <StatCard icon={Cpu} label="Devices" value={overview.devices.total} sub={`${overview.devices.online} online`} color="text-cyan-500" />
          <StatCard icon={Users} label="Team Members" value={overview.members} color="text-emerald-500" />
          <StatCard icon={Activity} label="Telemetry Readings" value={overview.telemetryRows.toLocaleString()} color="text-amber-500" />
          <StatCard icon={Trophy} label="Competitions" value={overview.competitions.total} sub={`${overview.competitions.entries} entries`} color="text-purple-500" />
          <StatCard icon={TrendingUp} label="Completed" value={overview.projects.completed} color="text-emerald-600" />
        </div>

        {/* AI Insights */}
        {isAdmin && (
          <div className="bg-gradient-to-r from-violet-500/5 via-indigo-500/5 to-purple-500/5 border border-violet-500/20 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">AI Lab Insights</h3>
                  <p className="text-[10px] text-muted-foreground">Powered by Gemini</p>
                </div>
              </div>
              <GenerateButton
                onClick={loadInsights}
                disabled={insightsLoading}
                isGenerating={insightsLoading}
                label={insights.length > 0 ? "Refresh" : "Generate Insights"}
                activeLabel="Analyzing..."
                hue={25}
              />
            </div>
            {insights.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((ins: any, i: number) => {
                  const iconMap: Record<string, any> = { trend: TrendingUp, alert: AlertTriangle, optimization: Lightbulb, anomaly: Zap };
                  const colorMap: Record<string, string> = {
                    info: "border-blue-500/30 bg-blue-500/5",
                    warning: "border-amber-500/30 bg-amber-500/5",
                    critical: "border-red-500/30 bg-red-500/5",
                  };
                  const iconColorMap: Record<string, string> = {
                    info: "text-blue-500",
                    warning: "text-amber-500",
                    critical: "text-red-500",
                  };
                  const InsIcon = iconMap[ins.type] || Eye;
                  return (
                    <div key={i} className={cn("border rounded-lg p-3 transition-all", colorMap[ins.severity] || "border-border")}>
                      <div className="flex items-start gap-2">
                        <InsIcon className={cn("h-4 w-4 mt-0.5 shrink-0", iconColorMap[ins.severity] || "text-primary")} />
                        <div>
                          <p className="text-xs font-semibold">{ins.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{ins.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Click "Generate Insights" to get AI-powered analysis of your lab data.
              </p>
            )}
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Department Breakdown */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />Projects by Department
            </h3>
            {deptData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No department data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={deptData} layout="vertical" margin={{ left: 40, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="active" stackId="a" fill="#6366f1" name="Active" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Type Pie */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />Project Types
            </h3>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={180}>
                  <RePie>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </RePie>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                  {pieData.map((d: any, i: number) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-foreground">{d.name}</span>
                      <span className="text-muted-foreground">({d.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Two columns: Devices + Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Device Health */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />Device Fleet ({devices.length})
            </h3>
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No devices registered.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {devices.map((d: any) => (
                  <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-transparent hover:border-border transition-colors">
                    {d.isOnline ? <Wifi className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <WifiOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground">{d.deviceCode} • {d.project?.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">{d._count?.telemetryData ?? 0} readings</p>
                      {d.wifiSignal !== null && <p className="text-[10px] text-muted-foreground">WiFi: {d.wifiSignal}dBm</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />Recent Activity
            </h3>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No activity yet.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {timeline.map((ev: any) => (
                  <div key={ev.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0",
                      ev.event === "ALERT" ? "bg-red-500" :
                      ev.event.includes("created") ? "bg-emerald-500" :
                      ev.event.includes("removed") ? "bg-amber-500" : "bg-primary"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{ev.event}</p>
                      {ev.description && <p className="text-[10px] text-muted-foreground truncate">{ev.description}</p>}
                      <div className="flex items-center gap-2 mt-0.5">
                        <Link to={`/projects/${ev.project?.id}`} className="text-[10px] text-primary hover:underline">{ev.project?.name}</Link>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(ev.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Projects */}
        {overview.recentProjects.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />Recent Projects
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {overview.recentProjects.map((p: any) => (
                <Link key={p.id} to={`/projects/${p.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-primary/20 transition-all group">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Cpu className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.projectCode} • {p.department}</p>
                    <p className="text-[10px] text-muted-foreground">{p._count.devices} devices • {p._count.members} members</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
