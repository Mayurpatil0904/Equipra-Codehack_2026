// frontend/src/pages/ProjectShowcase.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  Search,
  Filter,
  Heart,
  ExternalLink,
  Cpu,
  Github,
  Video,
  Award,
  Users,
  Layers,
  ArrowRight,
  Loader2,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { showcaseApi } from "@/lib/api";
import { TrustScoreBadge } from "@/components/TrustScoreBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProjectShowcase() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedTech, setSelectedTech] = useState("all");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const data = await showcaseApi.list({
        department: selectedDept !== "all" ? selectedDept : undefined,
        tech: selectedTech !== "all" ? selectedTech : undefined,
        search: search.trim() || undefined,
      });
      const projectList = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []);
      setProjects(projectList);
      const initialLiked = new Set<string>(
        projectList.filter((p: any) => p?.hasLiked).map((p: any) => p.id)
      );
      setLikedIds(initialLiked);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load showcase projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedDept, selectedTech]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const handleLike = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await showcaseApi.like(id);
      if (res.liked) {
        setLikedIds((prev) => new Set([...prev, id]));
        toast.success("Project upvoted!");
      } else {
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.info("Upvote removed");
      }

      setProjects((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, showcaseLikes: res.showcaseLikes, hasLiked: res.liked } : p
        )
      );
    } catch (err: any) {
      toast.error(err.message ?? "Please log in to upvote projects");
    }
  };

  const safeProjects = Array.isArray(projects) ? projects : [];
  const allTechs = Array.from(
    new Set(safeProjects.flatMap((p) => p?.technologyStack || []))
  ).slice(0, 10);

  return (
    <>
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background border-b border-border py-16">
        <div className="container relative z-10 text-center max-w-3xl mx-auto space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            University Innovation Gallery
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-foreground"
          >
            Project Expo &amp; Public Portfolios
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed"
          >
            Explore verified student innovations, IoT prototypes, and hackathon projects built with Equipra laboratory hardware.
          </motion.p>

          {/* Search bar */}
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            onSubmit={handleSearchSubmit}
            className="flex gap-2 max-w-lg mx-auto pt-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search projects by title, hardware, or idea…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-border bg-card shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              Search
            </button>
          </motion.form>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container py-8 space-y-6">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">Department:</span>
            {["all", "CSE", "ECE", "AIML", "ME", "CE"].map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full border transition-all",
                  selectedDept === dept
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {dept === "all" ? "All Departments" : dept}
              </button>
            ))}
          </div>

          {allTechs.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground">Tech:</span>
              <button
                onClick={() => setSelectedTech("all")}
                className={cn(
                  "px-2.5 py-0.5 text-[11px] rounded-md border transition-all",
                  selectedTech === "all"
                    ? "bg-secondary text-foreground font-semibold border-border"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                All
              </button>
              {allTechs.map((tech) => (
                <button
                  key={tech}
                  onClick={() => setSelectedTech(tech)}
                  className={cn(
                    "px-2.5 py-0.5 text-[11px] rounded-md border transition-all",
                    selectedTech === tech
                      ? "bg-primary/10 text-primary font-semibold border-primary/30"
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  )}
                >
                  {tech}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Loading showcase projects…</span>
          </div>
        ) : safeProjects.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-16 text-center space-y-3">
            <Layers className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <h3 className="text-base font-bold text-foreground">No showcase projects found</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Students can publish their projects to the public showcase directly from their Project Dashboard.
            </p>
            <Link
              to="/projects"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground mt-2"
            >
              Go to My Projects
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {safeProjects.map((proj, idx) => {
              const hasLiked = likedIds.has(proj.id);
              const hardwareCount = proj.equipmentLinks?.length ?? 0;
              const isVibrometer = proj.name?.toLowerCase().includes("vibrometer") || proj.name?.toLowerCase().includes("laser");

              return (
                <motion.div
                  key={proj.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.03 }}
                  viewport={{ once: true }}
                >
                  <div
                    className={cn(
                      "relative overflow-hidden bg-gradient-to-r from-emerald-950/20 via-card to-cyan-950/20 border border-emerald-500/30 rounded-2xl p-6 shadow-sm hover:border-emerald-500/60 hover:shadow-md transition-all group"
                    )}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      {/* Left: Badges, Title, Description, Specs */}
                      <div className="space-y-2.5 max-w-3xl flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                            <Sparkles className="h-3 w-3" />
                            {isVibrometer ? "FLAGSHIP PHYSICAL HARDWARE PROJECT" : "VERIFIED HARDWARE PROJECT"}
                          </span>

                          <span className="text-[11px] font-semibold text-muted-foreground font-mono">
                            Parul University • {proj.department || "ECE (Honors in IoT)"}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleLike(e, proj.id)}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ml-auto sm:ml-0",
                              hasLiked
                                ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                                : "bg-muted text-muted-foreground border-border hover:text-rose-500 hover:bg-rose-500/10"
                            )}
                          >
                            <Heart className={cn("h-3.5 w-3.5", hasLiked && "fill-rose-500")} />
                            <span>{proj.showcaseLikes ?? 0}</span>
                          </button>
                        </div>

                        {/* Title */}
                        <Link to={`/showcase/${proj.id}`}>
                          <h3 className="text-xl font-bold font-display text-foreground group-hover:text-primary transition-colors">
                            {proj.name}
                          </h3>
                        </Link>

                        {/* Headline */}
                        {proj.showcaseHeadline && (
                          <p className="text-xs font-semibold text-primary/90">
                            "{proj.showcaseHeadline}"
                          </p>
                        )}

                        {/* Description */}
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {proj.description || "Active academic engineering and laboratory project on Equipra."}
                        </p>

                        {/* Specs & Hardware metadata row */}
                        <div className="flex items-center gap-4 pt-1 text-[11px] text-muted-foreground flex-wrap">
                          {proj.technologyStack && proj.technologyStack.length > 0 ? (
                            <span className="flex items-center gap-1.5">
                              🔬 <strong>Tech / Sensors:</strong>
                              <span className="font-mono text-[10px] text-foreground">
                                {proj.technologyStack.slice(0, 4).join(", ")}
                              </span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              🔬 <strong>Sensors:</strong>
                              <span className="text-foreground">BPW34 Silicon PIN Photodiode</span>
                            </span>
                          )}

                          {hardwareCount > 0 && (
                            <span className="flex items-center gap-1.5">
                              ⚡ <strong>Hardware:</strong>
                              <span className="text-foreground font-medium">
                                {hardwareCount} Lab Items Verified
                              </span>
                            </span>
                          )}

                          <span className="flex items-center gap-1.5">
                            👤 <strong>Lead:</strong>
                            <span className="text-foreground font-medium">
                              {proj.createdBy?.name || "Student Researcher"}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Right: Action Buttons matching screenshot */}
                      <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 min-w-[210px]">
                        <Link
                          to={`/showcase/${proj.id}`}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
                        >
                          <Layers className="h-4 w-4" />
                          Explore Public Portfolio →
                        </Link>

                        <Link
                          to={`/projects/${proj.id}`}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground transition-all"
                        >
                          <Cpu className="h-3.5 w-3.5 text-primary" />
                          Launch Project Workspace
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
