// frontend/src/pages/Projects.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus, Cpu, Activity, Clock, Users, Loader2,
  Wifi, WifiOff, ChevronRight, Boxes, FileText, Layout,
  Radio, Sparkles, Zap, ShieldCheck, Layers, Terminal,
  ExternalLink, ArrowRight, Server, Gauge, Filter,
} from "lucide-react";
import { projectsApi, templatesApi } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import VibrometerTelemetry from "./VibrometerTelemetry";

type ProjectSectionTab = "all" | "vibrometer" | "iot";

// ── Create Project Modal ──────────────────────────────────────
function CreateProjectModal({
  initialData,
  onClose,
  onCreated,
}: {
  initialData?: any;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [f, setF] = useState({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    projectType: initialData?.projectType ?? "HARDWARE",
    department: initialData?.department ?? "",
    semester: initialData?.semester ?? "3rd",
    technologyStack: initialData?.technologyStack ?? [],
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    if (!f.name.trim()) { toast.error("Project name is required."); return; }
    setBusy(true);
    try {
      await projectsApi.create(f);
      toast.success("Project created successfully!");
      onCreated();
      onClose();
    } catch (e: any) { toast.error(e.message ?? "Failed to create project."); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md p-6 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="font-display text-lg font-bold text-foreground">
            {initialData ? `Create from Template: ${initialData.name}` : "New Engineering Project"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="space-y-3">
          {[
            { k: "name", l: "Project Name *", ph: "e.g. Optical Laser Vibrometer & Acoustic Receiver" },
            { k: "description", l: "Description", ph: "What does this project do?" },
            { k: "department", l: "Department", ph: "e.g. Electronics & Communication (ECE)" },
            { k: "semester", l: "Semester", ph: "e.g. 3rd" },
          ].map(({ k, l, ph }) => (
            <div key={k}>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{l}</label>
              {k === "description" ? (
                <textarea value={(f as any)[k]} onChange={e => set(k, e.target.value)}
                  placeholder={ph} rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />
              ) : (
                <input value={(f as any)[k]} onChange={e => set(k, e.target.value)}
                  placeholder={ph}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              )}
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Project Type</label>
            <select value={f.projectType} onChange={e => set("projectType", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
              <option value="HARDWARE">Physical Hardware (Analog PCB / Sensors / Laser / Actuators)</option>
              <option value="HYBRID">Hybrid (Physical Hardware + Cloud IoT / Dashboard)</option>
              <option value="SOFTWARE">Software / Embedded Firmware (ESP32 / RTOS / ML)</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted transition-colors duration-200">
            Cancel
          </button>
          <button onClick={handleCreate} disabled={busy}
            className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Creating…</> : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Project Full-Width Banner Card ───────────────────────────
function ProjectCard({ project, onOpenVibrometer }: { project: any; onOpenVibrometer?: () => void }) {
  const onlineDevices = (project.devices ?? []).filter((d: any) => d.status === "ONLINE").length;
  const totalDevices  = (project.devices ?? []).length;
  const membersCount  = (project.members ?? []).length + 1;
  const techStack     = (project.technologyStack ?? []).slice(0, 5);

  const isVibrometer = project.name?.toLowerCase().includes("vibrometer") || project.name?.toLowerCase().includes("laser");
  const isHardware = project.projectType === "HARDWARE" || isVibrometer;
  const isHybrid   = project.projectType === "HYBRID";

  // Card theme styling matching user screenshot
  const borderGradient = isHardware
    ? "from-emerald-950/20 via-card to-cyan-950/20 border-emerald-500/30 hover:border-emerald-500/60 shadow-sm"
    : isHybrid
    ? "from-purple-950/20 via-card to-indigo-950/20 border-purple-500/30 hover:border-purple-500/60 shadow-sm"
    : "from-blue-950/20 via-card to-cyan-950/20 border-blue-500/30 hover:border-blue-500/60 shadow-sm";

  const badgeBg = isHardware
    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
    : isHybrid
    ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30"
    : "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30";

  const departmentText = project.department
    ? `Parul University • ${project.department}`
    : "Parul University ECE (Honors in IoT)";

  return (
    <div className={cn(
      "relative overflow-hidden bg-gradient-to-r border rounded-2xl p-6 hover:shadow-md transition-all duration-200 group",
      borderGradient
    )}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Side: Metadata, Title, Description, Hardware/Tech Specs */}
        <div className="space-y-2.5 max-w-3xl flex-1">
          {/* Top Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider", badgeBg)}>
              <Sparkles className="h-3 w-3" />
              {isVibrometer ? "FLAGSHIP PHYSICAL HARDWARE PROJECT" : `${project.projectType || "HARDWARE"} PROJECT`}
            </span>

            <span className="text-[11px] font-semibold text-muted-foreground font-mono">
              {departmentText}
            </span>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/60 text-muted-foreground ml-auto sm:ml-0">
              {project.projectCode}
            </span>
          </div>

          {/* Big Title */}
          <h3 className="text-xl font-bold font-display text-foreground group-hover:text-primary transition-colors">
            {project.name}
          </h3>

          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {project.description || "Active academic engineering and laboratory project on Equipra."}
          </p>

          {/* Specs & Hardware metadata row */}
          <div className="flex items-center gap-4 pt-1 text-[11px] text-muted-foreground flex-wrap">
            {techStack.length > 0 ? (
              <span className="flex items-center gap-1.5">
                🔬 <strong>Tech / Sensors:</strong>
                <span className="font-mono text-[10px] text-foreground">
                  {techStack.join(", ")}
                </span>
              </span>
            ) : isVibrometer ? (
              <span className="flex items-center gap-1.5">
                🔬 <strong>Sensors:</strong>
                <span className="text-foreground">BPW34 Silicon PIN Photodiode</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                🔬 <strong>Sensors:</strong>
                <span className="text-foreground">Embedded Sensors &amp; Microcontrollers</span>
              </span>
            )}

            {isVibrometer ? (
              <>
                <span className="flex items-center gap-1.5">
                  ⚡ <strong>Op-Amps:</strong>
                  <span className="text-foreground">TL082 JFET TIA + LM386N-1</span>
                </span>
                <span className="flex items-center gap-1.5">
                  🔋 <strong>Power:</strong>
                  <span className="text-foreground">18650 Li-ion + 9V Isolated Rail</span>
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5">
                  ⚡ <strong>Devices:</strong>
                  <span className="text-foreground font-medium">
                    {totalDevices} Node{totalDevices !== 1 ? "s" : ""} ({onlineDevices} Online)
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  👥 <strong>Team:</strong>
                  <span className="text-foreground font-medium">
                    {membersCount} Contributor{membersCount !== 1 ? "s" : ""}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Action Buttons matching user screenshot */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 min-w-[210px]">
          {isVibrometer ? (
            <button
              onClick={onOpenVibrometer}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
            >
              <Activity className="h-4 w-4" />
              Launch Vibrometer Workbench →
            </button>
          ) : (
            <Link
              to={`/projects/${project.id}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
            >
              <Activity className="h-4 w-4" />
              Launch Project Workbench →
            </Link>
          )}

          {project.isPublicShowcase ? (
            <Link
              to={`/showcase/${project.id}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground transition-all"
            >
              <Layers className="h-3.5 w-3.5 text-primary" />
              Explore Public Expo Showcase
            </Link>
          ) : (
            <Link
              to={`/projects/${project.id}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground transition-all"
            >
              <Cpu className="h-3.5 w-3.5 text-primary" />
              Hardware Telemetry &amp; Config
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function Projects() {
  const { role } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get("tab") as ProjectSectionTab) || "all";
  const [activeTab, setActiveTab] = useState<ProjectSectionTab>(tabParam);

  const [projects, setProjects] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Sync tab state with URL search params
  const handleTabChange = (tab: ProjectSectionTab) => {
    setActiveTab(tab);
    setSearchParams(tab === "all" ? {} : { tab });
  };

  const load = async () => {
    setLoading(true);
    try { setProjects(await projectsApi.list()); }
    catch { toast.error("Failed to load projects."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    templatesApi.list().then(setTemplates).catch(() => {});
  }, []);

  const active = projects.filter(p => p.status === "ACTIVE");
  const others = projects.filter(p => p.status !== "ACTIVE");

  // Collect all IoT devices across projects for the IoT subpart
  const allDevices = projects.flatMap(p => (p.devices ?? []).map((d: any) => ({ ...d, projectName: p.name, projectId: p.id })));

  return (
    <div className="container py-8 space-y-6 animate-fade-in">
      {/* ── Main Header ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                Academic &amp; Cyber-Physical Lab Hub
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                Parul University
              </span>
            </div>
            <h1 className="font-display text-3xl font-extrabold text-foreground">
              Projects &amp; Hardware Engineering Hub
            </h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
              Build, test, and showcase physical hardware prototypes, optical laser vibrometry telemetry, and cloud IoT sensor streams.
            </p>
          </div>

          {(role === "student" || role === "faculty") && (
            <button
              onClick={() => {
                setSelectedTemplate(null);
                setShowCreate(true);
              }}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" /> New Project
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Top-Level Subpart Tabs ── */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-px overflow-x-auto">
        <button
          onClick={() => handleTabChange("all")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2",
            activeTab === "all"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Boxes className="h-4 w-4" />
          <span>All Projects &amp; Prototypes</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-mono">
            {projects.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("vibrometer")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2",
            activeTab === "vibrometer"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Activity className="h-4 w-4 text-emerald-500" />
          <span>Optical Laser Vibrometer (Hardware Telemetry)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
            Live Suite
          </span>
        </button>

        <button
          onClick={() => handleTabChange("iot")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2",
            activeTab === "iot"
              ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Server className="h-4 w-4 text-cyan-500" />
          <span>IoT &amp; Cloud Sensor Streams (Subpart)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-mono">
            {allDevices.length} Devices
          </span>
        </button>
      </div>

      {/* ── Subpart 1: All Projects & Prototypes ── */}
      {activeTab === "all" && (
        <div className="space-y-6">

          {/* Templates Banner */}
          {templates.length > 0 && !loading && (
            <div>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors duration-200 mb-3 font-semibold"
              >
                <Layout className="h-4 w-4" />
                <span>{showTemplates ? "Hide" : "Browse"} Quick-Start Project Templates ({templates.length})</span>
              </button>
              {showTemplates && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  {templates.map((tpl: any) => (
                    <div
                      key={tpl.id}
                      onClick={() => {
                        setSelectedTemplate(tpl);
                        setShowCreate(true);
                      }}
                      className="bg-card border border-border rounded-xl p-4 hover:border-primary/60 hover:shadow-md cursor-pointer transition-all duration-200 group flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{tpl.name}</p>
                            <span className="text-[10px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                              Use <ArrowRight className="h-3 w-3" />
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{tpl.description}</p>
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground flex-wrap">
                            <span className="font-semibold text-foreground px-1.5 py-0.5 rounded bg-muted">{tpl.projectType}</span>
                            {tpl.department && <span>• {tpl.department}</span>}
                            {tpl.technologyStack?.length > 0 && <span>• {tpl.technologyStack.length} techs</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Projects Stack */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" /> Loading projects…
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20 bg-card border border-border rounded-2xl p-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Boxes className="h-7 w-7 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2">No other custom projects yet</h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Create a hardware or software project, register your ESP32 or sensors, and get live telemetry inside Equipra.
              </p>
              {(role === "student" || role === "faculty") && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Create your first project
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {active.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-4 w-4 text-status-available" />
                    <h2 className="font-semibold text-foreground text-sm uppercase tracking-wider">
                      Active Projects ({active.length})
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {active.map(p => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        onOpenVibrometer={() => handleTabChange("vibrometer")}
                      />
                    ))}
                  </div>
                </section>
              )}
              {others.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-semibold text-foreground text-sm uppercase tracking-wider">
                      Completed / Archived ({others.length})
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {others.map(p => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        onOpenVibrometer={() => handleTabChange("vibrometer")}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Subpart 2: Optical Laser Vibrometer (Hardware Telemetry Workspace) ── */}
      {activeTab === "vibrometer" && (
        <div>
          <VibrometerTelemetry />
        </div>
      )}

      {/* ── Subpart 3: IoT & Cloud Sensor Streams Subpart ── */}
      {activeTab === "iot" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-cyan-500" />
                  <h3 className="font-bold text-base font-display text-foreground">
                    IoT Cloud Streams &amp; Device Registry
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time telemetry feeds from ESP32, Arduino, Raspberry Pi, and MQTT/HTTP microcontroller nodes.
                </p>
              </div>

              <Link
                to="/projects"
                onClick={() => setShowCreate(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
              >
                + Register New IoT Device
              </Link>
            </div>

            {/* Microcontroller Quick Setup Guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase">Step 1: Firmware Ingest</span>
                <p className="font-semibold text-foreground">HTTP POST / API Key</p>
                <p className="text-[11px] text-muted-foreground">
                  Send JSON payload <code className="font-mono text-[10px]">{"{ \"temperature\": 24.5 }"}</code> to <code className="font-mono text-[10px]">/api/telemetry/ingest</code> with <code className="font-mono text-[10px]">x-api-key</code>.
                </p>
              </div>

              <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">Step 2: Schema Binding</span>
                <p className="font-semibold text-foreground">Auto-Mapped Telemetry Defs</p>
                <p className="text-[11px] text-muted-foreground">
                  Fields like RPM, voltage, temperature, and vibration are mapped to live gauges and line charts.
                </p>
              </div>

              <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Step 3: WebSockets</span>
                <p className="font-semibold text-foreground">Real-Time Polling &amp; Sockets</p>
                <p className="text-[11px] text-muted-foreground">
                  Equipra updates widgets every 3 seconds with fallback WebSocket live streaming.
                </p>
              </div>
            </div>

            {/* Registered Devices List */}
            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Connected Microcontroller Nodes ({allDevices.length})
              </h4>

              {allDevices.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground border border-dashed border-border rounded-xl bg-muted/10">
                  <WifiOff className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  <p>No IoT devices registered yet.</p>
                  <p className="text-[11px] mt-1">Open any project in the "All Projects" tab to generate device keys.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allDevices.map((d: any) => (
                    <div key={d.id} className="p-4 bg-muted/20 border border-border rounded-xl space-y-2 hover:border-primary/30 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-xs text-foreground">{d.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{d.deviceCode} • {d.type}</p>
                        </div>
                        <span className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded-full",
                          d.status === "ONLINE"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {d.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/60">
                        <span className="truncate max-w-[150px]">Project: {d.projectName}</span>
                        <Link
                          to={`/projects/${d.projectId}`}
                          className="text-primary font-semibold hover:underline flex items-center gap-0.5 text-[10px]"
                        >
                          View Dashboard <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showCreate && (
        <CreateProjectModal
          initialData={selectedTemplate}
          onClose={() => {
            setShowCreate(false);
            setSelectedTemplate(null);
          }}
          onCreated={load}
        />
      )}
    </div>
  );
}
