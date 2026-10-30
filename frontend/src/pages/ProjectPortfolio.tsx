// frontend/src/pages/ProjectPortfolio.tsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Cpu,
  Github,
  Video,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Calendar,
  Layers,
  FileText,
  Users,
  Award,
  Sparkles,
  ArrowLeft,
  Loader2,
  QrCode,
  Radio,
  Clock,
  Heart,
  TrendingUp,
} from "lucide-react";
import { showcaseApi } from "@/lib/api";
import { TrustScoreBadge } from "@/components/TrustScoreBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProjectPortfolio() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await showcaseApi.get(id);
        setProject(data);
        setLikes(data.showcaseLikes || 0);
        setHasLiked(Boolean(data.hasLiked));
      } catch (err: any) {
        toast.error(err.message ?? "Failed to load project portfolio");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Public portfolio link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(
      `Check out my verified academic lab project "${project?.name}" built on Equipra!`
    );
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`, "_blank");
  };

  const handleLike = async () => {
    if (!id) return;
    try {
      const res = await showcaseApi.like(id);
      setLikes(res.showcaseLikes);
      setHasLiked(res.liked);
      toast.success(res.liked ? "Project upvoted!" : "Upvote removed");
    } catch (err: any) {
      toast.error(err.message ?? "Please log in to upvote");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Verifying and loading project portfolio…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container py-20 text-center space-y-4 max-w-md mx-auto">
        <Layers className="h-12 w-12 text-muted-foreground/40 mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Project Not Found</h2>
        <p className="text-sm text-muted-foreground">
          This project does not exist or has not been made public by the creator.
        </p>
        <Link
          to="/showcase"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Project Expo
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Top Navigation breadcrumb */}
      <div className="border-b border-border/60 bg-muted/20">
        <div className="container py-3 flex items-center justify-between">
          <Link
            to="/showcase"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Innovation Showcase
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted transition-colors shadow-sm"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied Link" : "Copy Portfolio Link"}
            </button>
            <button
              onClick={handleShareLinkedIn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0A66C2] text-white hover:bg-[#004182] transition-colors shadow-sm"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share on LinkedIn
            </button>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-primary/5 via-card to-background border-b border-border py-12">
        <div className="container max-w-5xl">
          <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {project.department}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {project.academicYear || "2025-26"} • {project.college?.name || "University Lab"}
                </span>
                {/* Verified by Equipra badge */}
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified Lab Project
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold font-display text-foreground leading-tight">
                {project.name}
              </h1>

              {project.showcaseHeadline && (
                <p className="text-sm sm:text-base font-semibold text-primary/90 italic">
                  "{project.showcaseHeadline}"
                </p>
              )}

              <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                {project.description}
              </p>

              {/* Tech stack */}
              {project.technologyStack && project.technologyStack.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {project.technologyStack.map((tech: string) => (
                    <span
                      key={tech}
                      className="text-xs font-medium px-3 py-1 rounded-lg bg-secondary text-secondary-foreground border border-border"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Card */}
            <div className="w-full md:w-auto shrink-0 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3 min-w-[240px]">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-xs text-muted-foreground font-semibold">Community Upvotes</span>
                <button
                  onClick={handleLike}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border transition-all",
                    hasLiked
                      ? "bg-rose-500 text-white border-rose-500"
                      : "bg-muted text-foreground border-border hover:bg-rose-500/10 hover:text-rose-500"
                  )}
                >
                  <Heart className={cn("h-3.5 w-3.5", hasLiked && "fill-white")} />
                  {likes}
                </button>
              </div>

              {/* Links */}
              <div className="space-y-2 text-xs">
                {project.githubRepo && (
                  <a
                    href={project.githubRepo}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/30 hover:bg-muted transition-colors font-semibold text-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <Github className="h-4 w-4" /> GitHub Repository
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}

                {project.demoVideo && (
                  <a
                    href={project.demoVideo}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/30 hover:bg-muted transition-colors font-semibold text-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-rose-500" /> Watch Live Demo
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="container max-w-5xl py-8 space-y-10">
        {/* Verified Lab Hardware Bill of Materials (BOM) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
              <Cpu className="h-5 w-5 text-emerald-500" />
              Verified Lab Equipment Bill of Materials (BOM)
            </h2>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <Check className="h-3 w-3" /> University Lab Audited
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {project.equipmentLinks && project.equipmentLinks.length > 0 ? (
              project.equipmentLinks.map((link: any) => (
                <div
                  key={link.id}
                  className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between hover:border-primary/30 transition-all shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">
                        {link.equipment.category}
                      </span>
                      {link.equipment.equipmentId && (
                        <span className="text-[11px] font-mono font-bold text-primary">
                          {link.equipment.equipmentId}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-foreground">{link.equipment.name}</h4>
                    {link.equipment.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {link.equipment.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-border text-[11px] text-muted-foreground flex justify-between items-center">
                    <span>Status: <strong className="text-emerald-500">Verified Issued</strong></span>
                    {link.request?.requestCode && (
                      <span className="font-mono text-[10px]">{link.request.requestCode}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full p-6 text-center text-xs text-muted-foreground bg-muted/20 border border-border rounded-xl">
                No physical hardware items currently linked to this showcase.
              </div>
            )}
          </div>
        </section>

        {/* Live IoT Devices Section (if connected) */}
        {project.devices && project.devices.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
              <Radio className="h-5 w-5 text-purple-500" />
              Connected IoT Microcontrollers &amp; Sensors
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {project.devices.map((dev: any) => (
                <div
                  key={dev.id}
                  className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Radio className="h-3.5 w-3.5 text-purple-500 animate-pulse" />
                      {dev.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Type: <span className="font-semibold text-foreground">{dev.type}</span> • ID:{" "}
                      <span className="font-mono">{dev.deviceCode}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                    Live Telemetry Ready
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Team Contributors & Project Guide */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Project Creators &amp; Guide
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Project Creator */}
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                {project.createdBy?.name ? project.createdBy.name[0] : "U"}
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                  {project.createdBy?.name}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Lead Creator • {project.createdBy?.department}
                </div>
                {project.creatorTrust && (
                  <TrustScoreBadge
                    score={project.creatorTrust.score}
                    tier={project.creatorTrust.tier}
                    size="sm"
                    className="mt-1"
                  />
                )}
              </div>
            </div>

            {/* Team Members */}
            {project.members &&
              project.members.map((m: any) => (
                <div
                  key={m.id}
                  className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-sm">
                    {m.user?.name ? m.user.name[0] : "M"}
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="text-xs font-bold text-foreground truncate">{m.user?.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {m.role || "Member"} • {m.user?.department}
                    </div>
                  </div>
                </div>
              ))}

            {/* Project Guide (Faculty) */}
            {project.guide && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  {project.guide.name[0]}
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="text-xs font-bold text-foreground truncate">
                    {project.guide.name}
                  </div>
                  <div className="text-[11px] text-primary font-medium">
                    Faculty Guide • {project.guide.department}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Project Documents & Blueprints */}
        {project.documents && project.documents.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Attached Schematics, Reports &amp; Presentations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {project.documents.map((doc: any) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 bg-card border border-border rounded-xl flex items-center justify-between hover:border-primary/40 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {doc.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">{doc.type}</div>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Verification Certificate Footer Card */}
        <section className="bg-gradient-to-r from-emerald-500/10 via-primary/5 to-purple-500/10 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-3">
          <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-foreground">Equipra Verified Academic Portfolio</h3>
          <p className="text-xs text-muted-foreground max-w-xl mx-auto leading-relaxed">
            This project's laboratory hardware usage, sensor checkouts, and faculty supervision are cryptographically verified by the Equipra Academic Hardware Management platform.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              Copy Verification URL for Resume
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
