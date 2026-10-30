// frontend/src/pages/ProjectDashboard.tsx
//
// Live IoT dashboard for a single project.
// Polls GET /api/telemetry/live/:deviceId every 3 seconds.
// Shows gauges, status cards, and charts using recharts.

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Wifi, WifiOff, Plus, Copy, Cpu,
  Loader2, AlertTriangle, Activity, Trash2,
  RefreshCw, Key, ChevronDown, ChevronRight,
  Thermometer, Zap, Radio, Eye, EyeOff,
  Settings, Users, Pencil, MoreVertical,
  FileText, ExternalLink, Boxes, Link2, Sparkles, Share2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { projectsApi, telemetryApi, showcaseApi } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TelemetryConfigModal } from "@/components/TelemetryConfigModal";
import { ProjectTimelinePanel } from "@/components/ProjectTimelinePanel";
import { EditProjectModal } from "@/components/EditProjectModal";
import { ProjectMembersModal } from "@/components/ProjectMembersModal";
import { useNavigate } from "react-router-dom";
import { useSocket } from "@/hooks/useSocket";
import VibrometerTelemetry from "./VibrometerTelemetry";

// ── Utility ───────────────────────────────────────────────────
const POLL_INTERVAL = 15000; // fallback poll every 15s (WebSocket is primary)

function fmtTime(d: string | Date) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtRelative(d: string | Date | null) {
  if (!d) return "Never";
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 5000)  return "Just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(d).toLocaleTimeString("en-IN");
}

// ── Add Device Modal ──────────────────────────────────────────
function AddDeviceModal({ projectId, onClose, onCreated }: { projectId: string; onClose: () => void; onCreated: (device: any) => void }) {
  const [f, setF] = useState({ name: "", type: "ESP32", firmwareVersion: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<any>(null);
  const [keyVisible, setKeyVisible] = useState(false);

  const handleCreate = async () => {
    if (!f.name.trim()) { toast.error("Device name is required."); return; }
    setBusy(true);
    try {
      const device = await projectsApi.createDevice(projectId, f);
      setCreated(device);
      onCreated(device);
    } catch (e: any) { toast.error(e.message ?? "Failed to add device."); }
    finally { setBusy(false); }
  };

  const copyKey = () => {
    if (!created?.apiKey) return;
    navigator.clipboard.writeText(created.apiKey);
    toast.success("API key copied to clipboard.");
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && !created) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md p-6">
        {!created ? (
          <>
            <h2 className="font-display text-lg font-bold mb-5">Register Device</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Device Name *</label>
                <input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Zone A Sensor Node"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Board Type</label>
                <select value={f.type} onChange={e => setF(p => ({ ...p, type: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  {["ESP32", "ESP8266", "ARDUINO", "RASPBERRY_PI", "NODEMCU", "STM32", "OTHER"].map(t => (
                    <option key={t} value={t}>{t.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Firmware Version</label>
                <input value={f.firmwareVersion} onChange={e => setF(p => ({ ...p, firmwareVersion: e.target.value }))}
                  placeholder="e.g. v1.0.0"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={onClose}
                className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={busy}
                className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Registering…</> : "Register Device"}
              </button>
            </div>
          </>
        ) : (
          // API Key reveal — shown ONLY once, immediately after creation
          <>
            <div className="flex items-center gap-2 mb-1">
              <Key className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Save your API Key</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              This key is used to authenticate your ESP32. Copy it now and paste it into your firmware —
              you can view it again anytime from this device's card.
            </p>

            <div className="bg-muted/50 border border-border rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">API Key</p>
                <div className="flex gap-1.5">
                  <button onClick={() => setKeyVisible(!keyVisible)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground">
                    {keyVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={copyKey}
                    className="p-1 rounded text-muted-foreground hover:text-primary">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className={cn("font-mono text-sm break-all", keyVisible ? "text-foreground" : "blur-sm select-none")}>
                {created.apiKey}
              </p>
            </div>

            {/* ESP32 code snippet */}
            <div className="bg-muted/30 rounded-xl p-3 mb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Paste into your ESP32 sketch:</p>
              <pre className="text-xs text-foreground overflow-x-auto">{`#include <HTTPClient.h>
#define EQUIPRA_KEY "${created.apiKey}"
#define EQUIPRA_URL "https://backend-eqipra.onrender.com/api/telemetry"

void sendData(float temp, int gas) {
  HTTPClient http;
  http.begin(EQUIPRA_URL);
  http.addHeader("Content-Type","application/json");
  http.addHeader("X-API-Key", EQUIPRA_KEY);
  String body = "{\\"temperature\\":" + String(temp) +
                ",\\"gasLevel\\":" + String(gas) + "}";
  http.POST(body);
  http.end();
}`}</pre>
            </div>

            <button onClick={onClose}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sensor Widget ─────────────────────────────────────────────
function SensorWidget({ fieldName, label, value, unit, dataType, widgetType, thresholdMin, thresholdMax, history }: any) {
  const isNumber  = dataType === "NUMBER" || (dataType == null && typeof value === "number");
  const isBool    = dataType === "BOOLEAN" || (dataType == null && typeof value === "boolean");
  const isString  = dataType === "STRING" || (!isNumber && !isBool);
  const numVal    = Number(value);
  const boolVal   = value === true || value === "true" || value === 1;

  const overMax = isNumber && thresholdMax != null && numVal > thresholdMax;
  const underMin = isNumber && thresholdMin != null && numVal < thresholdMin;
  const inAlert = overMax || underMin;

  if (isBool || widgetType === "STATUS_CARD" || widgetType === "LED") {
    return (
      <div className={cn("bg-card border rounded-2xl p-4 flex items-center gap-3",
        boolVal ? "border-status-available/40 bg-status-available/5" : "border-border")}>
        <div className={cn("w-3 h-3 rounded-full flex-shrink-0", boolVal ? "bg-status-available animate-pulse" : "bg-muted-foreground/40")} />
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className={cn("font-bold text-sm", boolVal ? "text-status-available" : "text-muted-foreground")}>
            {boolVal ? "Active / HIGH" : "Inactive / LOW"}
          </p>
        </div>
      </div>
    );
  }

  // String / text values — plain value card, no numeric parsing or sparkline
  if (isString) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
        <p className="text-lg font-bold text-foreground truncate" title={String(value ?? "—")}>
          {value != null && value !== "" ? String(value) : "—"}
        </p>
      </div>
    );
  }

  // Default: number value card + mini sparkline (covers GAUGE / CHART / VALUE)
  const chartData = (history ?? []).slice(-20).map((r: any) => ({
    t: fmtTime(r.t),
    v: r.v,
  }));

  return (
    <div className={cn("bg-card border rounded-2xl p-4",
      inAlert ? "border-status-fault/40 bg-status-fault/5" : "border-border")}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className={cn("text-2xl font-bold mt-0.5", inAlert ? "text-status-fault" : "text-foreground")}>
            {typeof numVal === "number" && !isNaN(numVal) ? numVal.toFixed(isNumber ? 1 : 0) : "—"}
            <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
          </p>
        </div>
        {inAlert && <AlertTriangle className="h-5 w-5 text-status-fault flex-shrink-0" />}
      </div>

      {chartData.length > 1 && (
        <ResponsiveContainer width="100%" height={50}>
          <LineChart data={chartData}>
            <Line type="monotone" dataKey="v" stroke={inAlert ? "hsl(var(--status-fault))" : "hsl(var(--primary))"} strokeWidth={1.5} dot={false} />
            {thresholdMax != null && <ReferenceLine y={thresholdMax} stroke="hsl(var(--status-fault))" strokeDasharray="3 3" />}
            {thresholdMin != null && <ReferenceLine y={thresholdMin} stroke="hsl(var(--status-fault))" strokeDasharray="3 3" />}
          </LineChart>
        </ResponsiveContainer>
      )}

      {(thresholdMin != null || thresholdMax != null) && (
        <p className="text-[10px] text-muted-foreground mt-1">
          Range: {thresholdMin ?? "—"} – {thresholdMax ?? "—"} {unit}
        </p>
      )}
    </div>
  );
}

// ── View Key Modal ───────────────────────────────────────────────
function ViewKeyModal({ device, onClose }: { device: any; onClose: () => void }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyVisible, setKeyVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await projectsApi.getDeviceKey(device.id);
        setApiKey(res.apiKey);
      } catch (e: any) { toast.error(e.message ?? "Failed to load API key."); onClose(); }
      finally { setLoading(false); }
    })();
  }, [device.id]);

  const copyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    toast.success("API key copied to clipboard.");
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md p-6">
        <div className="flex items-center gap-2 mb-1">
          <Key className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">{device.name}'s API Key</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Anyone with this key can send telemetry as this device — keep it private.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="bg-muted/50 border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">API Key</p>
              <div className="flex gap-1.5">
                <button onClick={() => setKeyVisible(!keyVisible)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                  {keyVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button onClick={copyKey} className="p-1 rounded text-muted-foreground hover:text-primary">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className={cn("font-mono text-sm break-all", keyVisible ? "text-foreground" : "blur-sm select-none")}>
              {apiKey}
            </p>
          </div>
        )}

        <button onClick={onClose}
          className="w-full border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}

// ── Regenerate Key Modal ────────────────────────────────────────
function RegenerateKeyModal({ device, onClose }: { device: any; onClose: () => void }) {
  const [step, setStep] = useState<"confirm" | "done">("confirm");
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyVisible, setKeyVisible] = useState(false);

  const handleRegenerate = async () => {
    setBusy(true);
    try {
      const res = await projectsApi.regenerateDeviceKey(device.id);
      setNewKey(res.apiKey);
      setStep("done");
    } catch (e: any) { toast.error(e.message ?? "Failed to regenerate key."); }
    finally { setBusy(false); }
  };

  const copyKey = () => {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    toast.success("API key copied to clipboard.");
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && step === "confirm") onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md p-6">
        {step === "confirm" ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-5 w-5 text-status-fault" />
              <h2 className="font-display text-lg font-bold">Regenerate API Key?</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              The current key for <span className="font-medium text-foreground">{device.name}</span> will
              stop working immediately. There's no way to view the old key again — you'll need to update
              your ESP32 firmware with the new one.
            </p>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleRegenerate} disabled={busy}
                className="flex-1 bg-status-fault text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Regenerating…</> : "Regenerate Key"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Key className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Save your new API Key</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              The old key stops working immediately — update your ESP32 firmware with this new one.
              You can view it again anytime from this device's card.
            </p>
            <div className="bg-muted/50 border border-border rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New API Key</p>
                <div className="flex gap-1.5">
                  <button onClick={() => setKeyVisible(!keyVisible)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                    {keyVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={copyKey} className="p-1 rounded text-muted-foreground hover:text-primary">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className={cn("font-mono text-sm break-all", keyVisible ? "text-foreground" : "blur-sm select-none")}>
                {newKey}
              </p>
            </div>
            <button onClick={onClose}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Device Panel ──────────────────────────────────────────────
function DevicePanel({ device: initialDevice, defs, onDefsUpdated }: { device: any; defs: any[]; onDefsUpdated?: (defs: any[]) => void }) {
  const [liveData, setLiveData] = useState<any>(null);
  const [history,  setHistory]  = useState<Record<string, any[]>>({});
  const [expanded, setExpanded] = useState(true);
  const [error,    setError]    = useState(false);
  const [showRegen, setShowRegen] = useState(false);
  const [showViewKey, setShowViewKey] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await telemetryApi.live(initialDevice.id);
      setLiveData(res);
      setError(false);

      // Maintain rolling history per field
      if (res.latest?.payload) {
        const t = res.latest.receivedAt;
        setHistory(prev => {
          const next = { ...prev };
          for (const [key, val] of Object.entries(res.latest.payload)) {
            if (typeof val === "number") {
              const arr = [...(next[key] ?? []), { t, v: val }];
              next[key] = arr.slice(-60); // keep last 60 readings
            }
          }
          return next;
        });
      }
    } catch {
      setError(true);
    }
  }, [initialDevice.id]);

  // WebSocket: instant updates from server
  const projectId = initialDevice.projectId ?? initialDevice.project?.id;
  useSocket(projectId, useCallback((wsData: any) => {
    if (wsData.deviceId !== initialDevice.id) return;
    // Update live payload from WebSocket push
    const payload = wsData.data;
    const t = wsData.timestamp;
    setLiveData((prev: any) => ({
      ...prev,
      latest: { payload, receivedAt: t },
      device: { ...(prev?.device ?? initialDevice), status: "ONLINE", lastSeenAt: t },
    }));
    setError(false);
    // Update history
    setHistory(prev => {
      const next = { ...prev };
      for (const [key, val] of Object.entries(payload)) {
        if (typeof val === "number") {
          const arr = [...(next[key] ?? []), { t, v: val }];
          next[key] = arr.slice(-60);
        }
      }
      return next;
    });
  }, [initialDevice.id]));

  useEffect(() => {
    poll(); // initial fetch
    intervalRef.current = setInterval(poll, POLL_INTERVAL); // fallback poll
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [poll]);

  const device   = liveData?.device ?? initialDevice;
  const payload  = liveData?.latest?.payload ?? {};
  const lastSeen = liveData?.device?.lastSeenAt;
  const isOnline = device.status === "ONLINE";

  // Prefer the defs from the latest poll (includes anything auto-configured
  // moments ago) over the defs passed down at page load — this is what
  // makes newly-detected sensor fields appear live, without a manual refresh.
  const liveDefs = liveData?.device?.project?.telemetryDefs;
  const activeDefs: any[] = (liveDefs && liveDefs.length > 0) ? liveDefs : defs;

  // If polling turned up more fields than the parent knows about (i.e. the
  // backend auto-configured a brand-new sensor), bubble that up so the
  // "configure fields" banner and TelemetryConfigModal both stay in sync.
  useEffect(() => {
    if (liveDefs && liveDefs.length > defs.length) {
      onDefsUpdated?.(liveDefs);
    }
  }, [liveDefs?.length]);

  // Figure out which fields to show — use defs if configured, else infer
  // a reasonable default per-field from the raw payload's JS types
  const fields = activeDefs.length > 0 ? activeDefs : Object.keys(payload).map(k => {
    const v = payload[k];
    const dataType = typeof v === "boolean" ? "BOOLEAN" : typeof v === "number" ? "NUMBER" : "STRING";
    return {
      fieldName: k, label: k, unit: "", dataType,
      widgetType: dataType === "BOOLEAN" ? "STATUS_CARD" : dataType === "NUMBER" ? "GAUGE" : "VALUE",
      thresholdMin: null, thresholdMax: null,
    };
  });

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Device header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/30 border-b border-border">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", isOnline ? "bg-status-available animate-pulse" : "bg-muted-foreground/40")} />
          <Cpu className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <span className="font-semibold text-sm text-foreground truncate block">{device.name}</span>
            <span className="text-[10px] text-muted-foreground">{device.deviceCode} · {device.type}</span>
          </div>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isOnline
            ? <span className="flex items-center gap-1 text-xs text-status-available font-medium"><Wifi className="h-3.5 w-3.5" />Online</span>
            : <span className="flex items-center gap-1 text-xs text-muted-foreground"><WifiOff className="h-3.5 w-3.5" />Offline</span>}
          <span className="text-[10px] text-muted-foreground hidden sm:block">{fmtRelative(lastSeen)}</span>
        </div>
      </div>

      {expanded && (
        <div className="p-4">
          {/* Meta row */}
          {(device.ipAddress || device.wifiSignal != null || device.firmwareVersion || device.apiKeyPrefix) && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
              {device.ipAddress && <span>📍 {device.ipAddress}</span>}
              {device.wifiSignal != null && <span>📶 {device.wifiSignal} dBm</span>}
              {device.firmwareVersion && <span>🔧 {device.firmwareVersion}</span>}
              {device.apiKeyPrefix && (
                <span className="flex items-center gap-1.5 font-mono">
                  <Key className="h-3 w-3" /> {device.apiKeyPrefix}
                  <button onClick={() => setShowViewKey(true)}
                    className="text-primary hover:underline font-sans font-medium not-italic">
                    View
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button onClick={() => setShowRegen(true)}
                    className="text-primary hover:underline font-sans font-medium not-italic">
                    Regenerate
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Offline state */}
          {!isOnline && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 text-muted-foreground text-sm mb-4">
              <WifiOff className="h-4 w-4 flex-shrink-0" />
              <span>No data received in the last 30 seconds. Check your ESP32 connection and that the API key is correct.</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-status-fault/10 text-status-fault text-sm mb-4">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Connection error — retrying…</span>
            </div>
          )}

          {/* Sensor widgets grid */}
          {fields.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {fields.map((def: any) => (
                <SensorWidget
                  key={def.fieldName}
                  {...def}
                  value={payload[def.fieldName]}
                  history={history[def.fieldName] ?? []}
                />
              ))}
            </div>
          ) : (
            isOnline && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Device is online but no sensor data received yet.
                Make sure your ESP32 is calling the telemetry endpoint.
              </div>
            )
          )}

          {/* Last updated */}
          {liveData?.latest && (
            <p className="text-[10px] text-muted-foreground text-right mt-3">
              Last reading: {fmtTime(liveData.latest.receivedAt)} · Auto-refreshes every 3s
            </p>
          )}
        </div>
      )}

      {showViewKey && (
        <ViewKeyModal device={device} onClose={() => setShowViewKey(false)} />
      )}
      {showRegen && (
        <RegenerateKeyModal device={device} onClose={() => setShowRegen(false)} />
      )}
    </div>
  );
}

// ── Add Document Modal ────────────────────────────────────────
const DOC_TYPES = ["REPORT", "PPT", "POSTER", "CIRCUIT_DIAGRAM", "SOURCE_CODE", "VIDEO", "IMAGE", "OTHER"];

function AddDocumentModal({ projectId, onClose, onAdded }: { projectId: string; onClose: () => void; onAdded: () => void }) {
  const [f, setF] = useState({ name: "", type: "REPORT", url: "" });
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    if (!f.name.trim()) { toast.error("Give the document a name."); return; }
    if (!/^https?:\/\/.+/.test(f.url.trim())) { toast.error("Paste a valid link (Drive, GitHub, YouTube, etc.)."); return; }
    setBusy(true);
    try {
      await projectsApi.addDocument(projectId, { ...f, url: f.url.trim() });
      toast.success("Document added.");
      onAdded();
      onClose();
    } catch (e: any) { toast.error(e.message ?? "Failed to add document."); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md p-6">
        <h2 className="font-display text-lg font-bold mb-1">Add Document</h2>
        <p className="text-xs text-muted-foreground mb-5">
          Paste a link — Google Drive, GitHub, YouTube, etc. No file upload needed.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Name *</label>
            <input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Final Report, Circuit Diagram"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Type</label>
            <select value={f.type} onChange={e => setF(p => ({ ...p, type: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
              {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Link *</label>
            <input value={f.url} onChange={e => setF(p => ({ ...p, url: e.target.value }))}
              placeholder="https://drive.google.com/..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleAdd} disabled={busy}
            className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Adding…</> : "Add Document"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Documents Panel ──────────────────────────────────────────
function DocumentsPanel({ projectId, documents, canEdit, onChanged }: { projectId: string; documents: any[]; canEdit: boolean; onChanged: () => void }) {
  const [showAdd, setShowAdd] = useState(false);

  const remove = async (docId: string) => {
    try { await projectsApi.deleteDocument(projectId, docId); toast.success("Document removed."); onChanged(); }
    catch (e: any) { toast.error(e.message ?? "Failed to remove document."); }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Documents</h3>
        </div>
        {canEdit && (
          <button onClick={() => setShowAdd(true)} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        )}
      </div>
      <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
        {documents.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No documents yet.</p>
        ) : documents.map((d: any) => (
          <div key={d.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 group">
            <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 min-w-0 flex-1">
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{d.name}</p>
                <p className="text-[10px] text-muted-foreground">{d.type.replace("_", " ")} · {d.uploadedBy?.name}</p>
              </div>
            </a>
            {canEdit && (
              <button onClick={() => remove(d.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-status-fault transition-opacity">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      {showAdd && (
        <AddDocumentModal projectId={projectId} onClose={() => setShowAdd(false)} onAdded={onChanged} />
      )}
    </div>
  );
}

// ── Link Equipment Modal ────────────────────────────────────────
function LinkEquipmentModal({ projectId, onClose, onLinked }: { projectId: string; onClose: () => void; onLinked: () => void }) {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try { setOptions(await projectsApi.listLinkableEquipment(projectId)); }
      catch { toast.error("Failed to load your issued equipment."); }
      finally { setLoading(false); }
    })();
  }, [projectId]);

  const handleLink = async () => {
    const req = options.find(r => r.id === selected);
    if (!req) { toast.error("Pick a piece of equipment to link."); return; }
    setBusy(true);
    try {
      await projectsApi.linkEquipment(projectId, { equipmentId: req.equipmentId, requestId: req.id });
      toast.success("Equipment linked to project.");
      onLinked();
      onClose();
    } catch (e: any) { toast.error(e.message ?? "Failed to link equipment."); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md p-6">
        <h2 className="font-display text-lg font-bold mb-1">Link Equipment</h2>
        <p className="text-xs text-muted-foreground mb-5">
          Only equipment currently issued to you and not linked elsewhere shows up here.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : options.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            You have no issued equipment available to link.<br />
            Request and collect equipment first from <span className="font-medium text-foreground">My Requests</span>.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto mb-4">
            {options.map((r: any) => (
              <label key={r.id} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                selected === r.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40")}>
                <input type="radio" name="equipment" checked={selected === r.id} onChange={() => setSelected(r.id)} className="accent-primary" />
                <span className="text-lg">{r.equipment?.emoji ?? "📦"}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.equipment?.name}</p>
                  <p className="text-[10px] text-muted-foreground">{r.requestCode} · {r.status}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleLink} disabled={busy || options.length === 0}
            className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Linking…</> : "Link Equipment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Equipment Panel ──────────────────────────────────────────
function EquipmentPanel({ projectId, links, canEdit, onChanged }: { projectId: string; links: any[]; canEdit: boolean; onChanged: () => void }) {
  const [showLink, setShowLink] = useState(false);

  const unlink = async (linkId: string) => {
    try { await projectsApi.unlinkEquipment(projectId, linkId); toast.success("Equipment unlinked."); onChanged(); }
    catch (e: any) { toast.error(e.message ?? "Failed to unlink equipment."); }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Boxes className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Linked Equipment</h3>
        </div>
        {canEdit && (
          <button onClick={() => setShowLink(true)} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <Link2 className="h-3.5 w-3.5" /> Link
          </button>
        )}
      </div>
      <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
        {links.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No equipment linked yet.</p>
        ) : links.map((l: any) => (
          <div key={l.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 group">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-base">{l.equipment?.emoji ?? "📦"}</span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{l.equipment?.name}</p>
                <p className="text-[10px] text-muted-foreground">{l.equipment?.category} · linked by {l.linkedBy?.name}</p>
              </div>
            </div>
            {canEdit && (
              <button onClick={() => unlink(l.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-status-fault transition-opacity">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      {showLink && (
        <LinkEquipmentModal projectId={projectId} onClose={() => setShowLink(false)} onLinked={onChanged} />
      )}
    </div>
  );
}

// ── Project Showcase Modal ──────────────────────────────────────
function ProjectShowcaseModal({ project, onClose, onUpdated }: { project: any; onClose: () => void; onUpdated: () => void }) {
  const [isPublic, setIsPublic] = useState(project.isPublicShowcase ?? false);
  const [headline, setHeadline] = useState(project.showcaseHeadline ?? "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const portfolioUrl = `${window.location.origin}/showcase/${project.id}`;

  const handleSave = async () => {
    setSaving(true);
    try {
      await showcaseApi.toggle(project.id, {
        isPublicShowcase: isPublic,
        showcaseHeadline: headline,
      });
      toast.success(isPublic ? "Project published to public showcase!" : "Project set to private");
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update showcase settings");
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(portfolioUrl);
    setCopied(true);
    toast.success("Public portfolio URL copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-base font-display text-foreground">Public Portfolio &amp; Expo</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Publish your project to the Equipra Innovation Gallery with verified lab equipment usage. Anyone with your link can view your portfolio without logging in.
        </p>

        {/* Toggle switch */}
        <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30 cursor-pointer">
          <div>
            <div className="text-xs font-semibold text-foreground">Public Portfolio Visibility</div>
            <div className="text-[10px] text-muted-foreground">Show in college showcase &amp; enable public share link</div>
          </div>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={e => setIsPublic(e.target.checked)}
            className="h-4 w-4 accent-primary rounded cursor-pointer"
          />
        </label>

        {/* Headline */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Showcase Headline / Subtitle (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Winner at SIH 2026 • Autonomous LoRa Agritech"
            value={headline}
            onChange={e => setHeadline(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Shareable Link Box */}
        {isPublic && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
            <span className="text-[11px] font-bold text-primary flex items-center gap-1">
              🔗 Shareable Portfolio Link
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={portfolioUrl}
                className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1 text-[11px] font-mono text-muted-foreground select-all"
              />
              <button
                onClick={copyUrl}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <button onClick={onClose} className="px-3.5 py-1.5 text-xs rounded-lg border border-border hover:bg-muted font-medium">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const { role } = useApp();
  const navigate = useNavigate();
  const [project,  setProject]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  // ✅ NEW — config, edit, and members modals
  const [showConfig,   setShowConfig]   = useState(false);
  const [showEdit,     setShowEdit]     = useState(false);
  const [showMembers,  setShowMembers]  = useState(false);
  const [showShowcase, setShowShowcase] = useState(false);
  const [subpartTab,   setSubpartTab]   = useState<"iot" | "vibrometer">("iot");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try { setProject(await projectsApi.get(id)); }
    catch { toast.error("Failed to load project."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
    </div>
  );

  if (!project) return (
    <div className="container py-20 text-center">
      <p className="text-muted-foreground">Project not found.</p>
      <Link to="/projects" className="text-primary hover:underline text-sm mt-2 inline-block">← Back to Projects</Link>
    </div>
  );

  const devices = project.devices ?? [];
  const defs    = project.telemetryDefs ?? [];

  return (
    <div className="container py-8 space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <Link to="/projects" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="h-4 w-4" /> Projects
      </Link>

      {/* Project header */}
      <div className="flex items-start justify-between gap-4 flex-wrap border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-2xl font-bold text-foreground">{project.name}</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {project.projectCode}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {project.projectType}
            </span>
          </div>
          {project.description && <p className="text-muted-foreground text-sm max-w-3xl">{project.description}</p>}
          {project.guide && (
            <p className="text-xs text-muted-foreground mt-1">
              Guide: <span className="text-foreground font-medium">{project.guide.name}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={load}
            className="flex items-center gap-1.5 border border-border px-3 py-2 rounded-lg text-xs font-semibold hover:bg-muted transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          {(role === "student" || role === "faculty" || role === "admin") && (
            <>
              <button onClick={() => setShowMembers(true)}
                className="flex items-center gap-1.5 border border-border px-3 py-2 rounded-lg text-xs font-semibold hover:bg-muted transition-colors">
                <Users className="h-3.5 w-3.5" /> Team
              </button>
              <button onClick={() => setShowShowcase(true)}
                className={cn(
                  "flex items-center gap-1.5 border px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                  project.isPublicShowcase
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                    : "border-border hover:bg-muted"
                )}>
                <Sparkles className="h-3.5 w-3.5" />
                {project.isPublicShowcase ? "Public Portfolio (Live)" : "Showcase"}
              </button>
              <button onClick={() => setShowConfig(true)}
                className="flex items-center gap-1.5 border border-border px-3 py-2 rounded-lg text-xs font-semibold hover:bg-muted transition-colors">
                <Settings className="h-3.5 w-3.5" /> Configure
              </button>
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add Device
              </button>
              {/* ✅ NEW — overflow menu for Edit/Delete */}
              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 border border-border rounded-lg hover:bg-muted transition-colors">
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg py-1.5 z-20 min-w-[140px]">
                      <button onClick={() => { setShowEdit(true); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors text-left">
                        <Pencil className="h-3.5 w-3.5" /> Edit Project
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Subpart Navigation Bar Inside Project Workspace ── */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-px overflow-x-auto">
        <button
          onClick={() => setSubpartTab("iot")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2",
            subpartTab === "iot"
              ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Radio className="h-4 w-4 text-cyan-500" />
          <span>IoT Cloud Telemetry &amp; Devices (Subpart)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-mono">
            {devices.length} Nodes
          </span>
        </button>

        <button
          onClick={() => setSubpartTab("vibrometer")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2",
            subpartTab === "vibrometer"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Activity className="h-4 w-4 text-emerald-500" />
          <span>Physical Hardware &amp; Laser Vibrometer Telemetry (Subpart)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
            Live Suite
          </span>
        </button>
      </div>

      {/* ── Subpart Content Views ── */}
      {subpartTab === "vibrometer" ? (
        <div>
          <VibrometerTelemetry />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mb-8">
          {/* Left — live devices */}
          <div className="space-y-6">
          {devices.length === 0 ? (
            <div className="text-center py-20 bg-card border border-border rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Radio className="h-7 w-7 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2">No devices yet</h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Register your ESP32 or Arduino here. You'll get an API key to paste into your firmware — then sensor data flows in automatically.
              </p>
              <button onClick={() => setShowAdd(true)}
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                Register your first device
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-foreground">Live Dashboard</h2>
                <span className="text-xs text-muted-foreground">({devices.length} device{devices.length !== 1 ? "s" : ""})</span>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                  <div className="w-1.5 h-1.5 rounded-full bg-status-available animate-pulse" />
                  Live via WebSocket
                </div>
              </div>
              {defs.length === 0 && (
                <button onClick={() => setShowConfig(true)}
                  className="w-full flex items-center gap-2 text-left p-3 rounded-xl bg-primary/8 border border-primary/20 hover:bg-primary/12 transition-colors">
                  <Settings className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">
                    <span className="font-semibold text-primary">No sensor fields configured yet.</span>{" "}
                    Click here to set labels, units, and alert thresholds for your sensor data.
                  </span>
                </button>
              )}
              {devices.map((device: any) => (
                <DevicePanel
                  key={device.id}
                  device={device}
                  defs={defs}
                  onDefsUpdated={(newDefs) => setProject((p: any) => ({ ...p, telemetryDefs: newDefs }))}
                />
              ))}
            </>
          )}
        </div>

        {/* Right — documents, equipment, timeline (always visible) */}
        <div className="space-y-6">
          <DocumentsPanel
            projectId={id!}
            documents={project.documents ?? []}
            canEdit={role === "student" || role === "faculty" || role === "admin"}
            onChanged={load}
          />
          <EquipmentPanel
            projectId={id!}
            links={project.equipmentLinks ?? []}
            canEdit={role === "student" || role === "faculty" || role === "admin"}
            onChanged={load}
          />
          <ProjectTimelinePanel entries={project.timeline ?? []} />
        </div>
      </div>
      )}

      {showAdd && id && (
        <AddDeviceModal
          projectId={id}
          onClose={() => setShowAdd(false)}
          onCreated={() => load()}
        />
      )}

      {showConfig && id && (
        <TelemetryConfigModal
          projectId={id}
          existingDefs={defs}
          onClose={() => setShowConfig(false)}
          onSaved={() => load()}
        />
      )}

      {showEdit && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={() => load()}
          onDeleted={() => navigate("/projects")}
        />
      )}

      {showMembers && (
        <ProjectMembersModal
          project={project}
          onClose={() => setShowMembers(false)}
          onChanged={() => load()}
        />
      )}

      {showShowcase && (
        <ProjectShowcaseModal
          project={project}
          onClose={() => setShowShowcase(false)}
          onUpdated={() => load()}
        />
      )}
    </div>
  );
}
