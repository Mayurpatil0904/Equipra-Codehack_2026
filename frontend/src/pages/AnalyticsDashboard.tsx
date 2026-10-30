// frontend/src/pages/AnalyticsDashboard.tsx
//
// AI Analytics Dashboard — shows health score, anomaly detection,
// trend analysis, and recommendations for a project.

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Activity, AlertTriangle, TrendingUp, TrendingDown,
  Minus, Brain, Heart, Loader2, ShieldCheck, ShieldAlert, ShieldX,
  Lightbulb, BarChart3, Cpu, Wifi, WifiOff, RefreshCw,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from "recharts";
import { analyticsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Colors ────────────────────────────────────────────────────
const RISK_COLORS = {
  safe:    { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30", ring: "ring-emerald-500/20" },
  warning: { bg: "bg-amber-500/10",   text: "text-amber-500",   border: "border-amber-500/30",   ring: "ring-amber-500/20" },
  danger:  { bg: "bg-red-500/10",     text: "text-red-500",     border: "border-red-500/30",     ring: "ring-red-500/20" },
};

const TREND_ICON: Record<string, any> = {
  rising:  TrendingUp,
  falling: TrendingDown,
  stable:  Minus,
  insufficient_data: BarChart3,
};

const CHART_COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981"];

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Health Ring ───────────────────────────────────────────────
function HealthRing({ score, label, size = 160 }: { score: number; label: string; size?: number }) {
  const radius  = (size - 16) / 2;
  const circum  = 2 * Math.PI * radius;
  const offset  = circum * (1 - score / 100);
  const color   = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="currentColor" className="text-muted/20" strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circum} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground font-medium mt-0.5">{label}</span>
      </div>
    </div>
  );
}

// ── Field Card ────────────────────────────────────────────────
function FieldCard({ field, projectId, onSelect }: { field: any; projectId: string; onSelect: (f: string) => void }) {
  const risk = RISK_COLORS[field.riskLevel as keyof typeof RISK_COLORS] ?? RISK_COLORS.safe;
  const TrendIcon = TREND_ICON[field.trend] ?? Minus;

  return (
    <button onClick={() => onSelect(field.fieldName)}
      className={cn("bg-card border rounded-xl p-4 text-left hover:shadow-lg transition-all group", risk.border)}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-sm">{field.label}</p>
          <p className="text-xs text-muted-foreground">{field.fieldName}</p>
        </div>
        <div className={cn("p-1.5 rounded-lg", risk.bg)}>
          {field.riskLevel === "safe" ? <ShieldCheck className={cn("h-4 w-4", risk.text)} /> :
           field.riskLevel === "warning" ? <ShieldAlert className={cn("h-4 w-4", risk.text)} /> :
           <ShieldX className={cn("h-4 w-4", risk.text)} />}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold tabular-nums">
          {field.currentValue !== null ? field.currentValue : "—"}
        </span>
        {field.unit && <span className="text-sm text-muted-foreground">{field.unit}</span>}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <div className="bg-muted/50 rounded-lg px-2 py-1">
          <span className="text-muted-foreground block">Mean</span>
          <span className="font-medium">{field.mean}</span>
        </div>
        <div className="bg-muted/50 rounded-lg px-2 py-1">
          <span className="text-muted-foreground block">Min</span>
          <span className="font-medium">{field.min}</span>
        </div>
        <div className="bg-muted/50 rounded-lg px-2 py-1">
          <span className="text-muted-foreground block">Max</span>
          <span className="font-medium">{field.max}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <TrendIcon className={cn("h-3.5 w-3.5",
            field.trend === "rising" ? "text-amber-500" :
            field.trend === "falling" ? "text-blue-500" : "text-muted-foreground")} />
          <span className="capitalize text-muted-foreground">{field.trend.replace("_", " ")}</span>
        </div>
        {field.isAnomaly && (
          <span className="flex items-center gap-1 text-red-500 font-medium">
            <AlertTriangle className="h-3 w-3" />Anomaly
          </span>
        )}
      </div>

      {field.prediction && (
        <p className="text-[10px] text-amber-600 bg-amber-500/10 rounded-md px-2 py-1 mt-2">{field.prediction}</p>
      )}
    </button>
  );
}

// ── Field Detail Modal ────────────────────────────────────────
function FieldDetailModal({ projectId, fieldName, onClose }: { projectId: string; fieldName: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.getFieldAnalytics(projectId, fieldName, 200)
      .then(setData)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [projectId, fieldName]);

  if (loading) return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl p-8 flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />Loading analysis…
      </div>
    </div>
  );

  if (!data) return null;

  const series = data.series ?? [];
  const stats  = data.statistics ?? {};

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display text-lg font-bold">{data.label ?? fieldName}</h2>
            <p className="text-sm text-muted-foreground">
              {stats.count} readings • Trend: <span className="font-medium capitalize">{stats.trend}</span>
              {data.unit && ` • Unit: ${data.unit}`}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
        </div>

        {/* Statistics summary */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          {[
            ["Mean", stats.mean],
            ["Std Dev", stats.stdDev],
            ["Min", stats.min],
            ["Max", stats.max],
            ["Slope", stats.slope],
          ].map(([label, value]) => (
            <div key={label as string} className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
              <p className="text-sm font-bold tabular-nums">{value ?? "—"}</p>
            </div>
          ))}
        </div>

        {/* Chart with moving averages */}
        {series.length > 3 && (
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
              Time Series with Moving Averages
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="t" tickFormatter={fmtTime} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip labelFormatter={fmtTime}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                {data.thresholdMax !== null && (
                  <ReferenceLine y={data.thresholdMax} stroke="#ef4444" strokeDasharray="5 5" label={{ value: `Max: ${data.thresholdMax}`, position: "right", fontSize: 10, fill: "#ef4444" }} />
                )}
                {data.thresholdMin !== null && (
                  <ReferenceLine y={data.thresholdMin} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: `Min: ${data.thresholdMin}`, position: "right", fontSize: 10, fill: "#3b82f6" }} />
                )}
                <Area type="monotone" dataKey="v" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} name={data.label ?? fieldName} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ma5" stroke="#f59e0b" strokeDasharray="4 4" name="MA-5" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="ma10" stroke="#10b981" strokeDasharray="6 3" name="MA-10" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground justify-center">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-500 inline-block" />Raw</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block border-dashed" />MA-5</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block" />MA-10</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const { projectId } = useParams();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedField, setSelectedField] = useState<string | null>(null);

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      setAnalytics(await analyticsApi.getProjectAnalytics(projectId));
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId]);

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />Analyzing project…
    </div>
  );

  if (!analytics) return null;

  const risk = RISK_COLORS[analytics.overallRisk as keyof typeof RISK_COLORS] ?? RISK_COLORS.safe;

  return (
    <>
      {selectedField && (
        <FieldDetailModal projectId={projectId!} fieldName={selectedField} onClose={() => setSelectedField(null)} />
      )}

      {/* Header */}
      <section className="bg-muted/30 border-b border-border py-8">
        <div className="container">
          <Link to={`/projects/${projectId}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />Back to Project
          </Link>
          <div className="flex items-center gap-3">
            <Brain className="h-7 w-7 text-primary" />
            <div>
              <h1 className="font-display text-2xl font-bold">AI Analytics</h1>
              <p className="text-sm text-muted-foreground">{analytics.projectName}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-6 space-y-6">
        {/* Top row: Health Score + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Health Score */}
          <div className={cn("lg:col-span-1 bg-card border rounded-xl p-5 flex flex-col items-center justify-center", risk.border)}>
            <HealthRing score={analytics.healthScore} label={analytics.healthLabel} />
            <p className="text-xs text-muted-foreground mt-3">Project Health Score</p>
          </div>

          {/* Stats cards */}
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Cpu,         label: "Devices",        value: analytics.deviceCount,     color: "text-primary" },
              { icon: analytics.onlineDevices > 0 ? Wifi : WifiOff,
                                   label: "Online",         value: `${analytics.onlineDevices}/${analytics.deviceCount}`,
                                                                                              color: analytics.onlineDevices > 0 ? "text-emerald-500" : "text-red-500" },
              { icon: Activity,    label: "Readings",       value: analytics.totalReadings,   color: "text-cyan-500" },
              { icon: AlertTriangle, label: "Active Alerts", value: analytics.alerts.length,   color: analytics.alerts.length > 0 ? "text-amber-500" : "text-muted-foreground" },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className={cn("h-4 w-4", s.color)} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <span className="text-xl font-bold tabular-nums">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {analytics.alerts.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />Active Alerts
            </h3>
            <div className="space-y-2">
              {analytics.alerts.map((a: any, i: number) => (
                <div key={i} className={cn("flex items-start gap-3 p-3 rounded-lg border",
                  a.severity === "danger" ? "bg-red-500/5 border-red-500/20" : "bg-amber-500/5 border-amber-500/20")}>
                  {a.severity === "danger" ? <ShieldX className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /> :
                   <ShieldAlert className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />}
                  <div>
                    <p className="text-sm font-medium">{a.field}</p>
                    <p className="text-xs text-muted-foreground">{a.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Field Analysis Cards */}
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />Sensor Field Analysis
            <span className="text-xs text-muted-foreground font-normal ml-1">(click for detailed chart)</span>
          </h3>
          {analytics.fields.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
              <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No telemetry fields defined yet.</p>
              <p className="text-xs mt-1">Configure telemetry definitions in the project dashboard.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.fields.map((f: any) => (
                <FieldCard key={f.fieldName} field={f} projectId={projectId!} onSelect={setSelectedField} />
              ))}
            </div>
          )}
        </div>

        {/* Recommendations */}
        {analytics.recommendations.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />AI Recommendations
            </h3>
            <div className="space-y-2">
              {analytics.recommendations.map((r: string, i: number) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30">
                  <span className="text-sm">{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={load}
          className="flex items-center gap-2 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="h-4 w-4" />Refresh Analysis
        </button>
      </div>
    </>
  );
}
