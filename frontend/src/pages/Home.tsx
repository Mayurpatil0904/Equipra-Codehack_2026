import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Package, ClipboardList, MessageSquare, Users,
  Search, ArrowRight, BarChart3, BookOpen,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { equipmentApi, requestsApi } from "@/lib/api";
import { StackedShowcase } from "@/components/effects/StackedShowcase";
import { LayoutTextFlip } from "@/components/effects/LayoutTextFlip";
import { StaggeredFeatureGrid } from "@/components/effects/StaggeredFeatureGrid";
import { FaqAccordion } from "@/components/effects/FaqAccordion";
import { ImageRevealList } from "@/components/effects/ImageRevealList";

const features = [
  { icon: Package,       title: "Equipment Inventory",  desc: "Browse all available lab equipment with real-time availability and condition status.",       to: "/inventory" },
  { icon: ClipboardList, title: "Issue Requests",       desc: "Submit requests with project details. Routes automatically through Faculty → Lab Assistant.",   to: "/request" },
  { icon: MessageSquare, title: "Secure Messages",      desc: "Communicate with lab assistants for collection details. 50-word message limit.",                to: "/messages" },
  { icon: Users,         title: "Team Projects",        desc: "Professors create group projects with unique Team IDs for collective equipment issuance.",       to: "/teams" },
  { icon: Search,        title: "Fault Scan",           desc: "Pre and post-issue scanning ensures equipment quality and transparent accountability records.",   to: "/fault-scan" },
];

export default function Home() {
  const { role } = useApp();
  const [liveStats, setLiveStats] = useState([
    { value: "—", label: "Hardware Items" },
    { value: "—", label: "Categories" },
    { value: "100%", label: "Logged Transactions" },
    { value: "—", label: "Lab Locations" },
  ]);

  const [showcaseColumns, setShowcaseColumns] = useState<
    { label: string; count: string; items: string[] }[]
  >([]);

  useEffect(() => {
    async function loadStats() {
      try {
        const [items, cats, reqs] = await Promise.all([
          equipmentApi.list(),
          equipmentApi.categories(),
          requestsApi.list().catch(() => []),
        ]);
        const locations = new Set(items.map((i: any) => i.labLocation).filter(Boolean));
        setLiveStats([
          { value: `${items.length}+`, label: "Hardware Items" },
          { value: String(cats.length), label: "Categories" },
          { value: "100%", label: "Logged Transactions" },
          { value: String(locations.size), label: "Lab Locations" },
        ]);

        const txnLabels = (reqs as any[])
          .slice(0, 5)
          .map((r) => `${r.equipment?.name ?? "Equipment"} · ${r.status}`);

        setShowcaseColumns([
          {
            label: "Hardware Items",
            count: `${items.length}+`,
            items: items.slice(0, 5).map((i: any) => i.name),
          },
          {
            label: "Categories",
            count: String(cats.length),
            items: cats.slice(0, 5),
          },
          {
            label: "Logged Transactions",
            count: "100%",
            items: txnLabels.length > 0 ? txnLabels : ["All activity tracked"],
          },
          {
            label: "Lab Locations",
            count: String(locations.size),
            items: Array.from(locations).slice(0, 5) as string[],
          },
        ]);
      } catch {}
    }
    loadStats();
  }, []);

  const heroRef = useRef<HTMLElement>(null);
  const [heroGlow, setHeroGlow] = useState({ x: 0, y: 0 });
  const handleHeroMouse = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHeroGlow({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };



  return (
    <>
      {/* Hero */}
      <section
        ref={heroRef}
        onMouseMove={handleHeroMouse}
        className="relative gradient-hero gradient-hero-animated hero-dot-pattern text-neutral-900 dark:text-white py-16 md:py-24 overflow-hidden"
      >
        {/* Cursor glow */}
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-200"
          style={{
            background: `radial-gradient(600px circle at ${heroGlow.x}px ${heroGlow.y}px, hsl(var(--primary) / 0.08), transparent 40%)`,
          }}
        />
        <motion.div
          className="container relative z-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-black/5 border border-black/10 dark:bg-white/10 dark:border-white/20 rounded-full px-4 py-1.5 text-xs font-medium backdrop-blur-sm"
            >
              🎓 Academic Equipment Management Platform
            </motion.div>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight cursor-default text-center">
            <span className="text-gradient">Equipra</span>
          </h1>
          <div className="text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            <LayoutTextFlip
              text="Smart Lab Management,"
              words={["Accountable.", "Simplified.", "Digitized.", "Organized."]}
              intervalMs={3200}
              className="justify-center"
            />
            <p className="mt-3 text-neutral-600 dark:text-white/70">
              An Academic Platform for Transparent Access to Laboratory Resources.
              Enabling universities to digitally organize, monitor, and coordinate
              equipment for academic excellence.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/inventory" className="btn-metallic btn-metallic-filled w-full sm:w-auto">
              <span className="btn-metallic-inner text-sm">
                <Package className="h-4 w-4" />
                View Inventory
              </span>
            </Link>
            {role === "student" && (
              <Link to="/request" className="btn-metallic w-full sm:w-auto">
                <span className="btn-metallic-inner text-sm">
                  <ClipboardList className="h-4 w-4" />
                  Request Equipment
                </span>
              </Link>
            )}
            {role === "admin" && (
              <Link to="/admin" className="btn-metallic w-full sm:w-auto">
                <span className="btn-metallic-inner text-sm">
                  <BarChart3 className="h-4 w-4" />
                  Admin Dashboard
                </span>
              </Link>
            )}
            {role === "faculty" && (
              <Link to="/faculty" className="btn-metallic w-full sm:w-auto">
                <span className="btn-metallic-inner text-sm">
                  <BarChart3 className="h-4 w-4" />
                  Faculty Dashboard
                </span>
              </Link>
            )}
            <a href="#guidelines" className="btn-metallic w-full sm:w-auto">
              <span className="btn-metallic-inner text-sm">
                <BookOpen className="h-4 w-4" />
                Guidelines
              </span>
            </a>
          </div>
        </motion.div>

      </section>

      {/* Stats showcase — outside hero */}
      {showcaseColumns.length > 0 && (
        <section className="py-10 bg-background border-b border-border">
          <div className="container">
            <StackedShowcase columns={showcaseColumns} />
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">Platform Features</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Everything you need for seamless lab equipment management in one place.
            </p>
          </div>
          <StaggeredFeatureGrid features={features} />
        </div>
      </section>

      {/* Guidelines */}
      <section id="guidelines" className="py-16">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto items-start">
            {/* Left: Usage Guidelines */}
            <FaqAccordion
              title="Usage Guidelines"
              items={[
                { question: "Academic Use Only", answer: "All hardware is provided exclusively for academic projects, coursework, research, and learning purposes. Commercial use is strictly prohibited." },
                { question: "Approval Workflow", answer: "Requests route: Student → Faculty → Lab Assistant → Final Approval. Each stage has 24 hours to process. Track your request status in real-time from your dashboard." },
                { question: "14-Day Maximum Borrowing", answer: "Equipment may be borrowed for up to 14 days. Extensions must be requested at least 2 days before the due date through the platform." },
                { question: "Handle Equipment Responsibly", answer: "Use anti-static protection for sensitive components. Do not expose equipment to extreme temperatures, moisture, or physical shock. Follow all lab safety protocols." },
                { question: "University Property", answer: "All hardware remains university property. The department retains full control over lending policies. Any damage or loss must be reported immediately." },
                { question: "Team Lock Policy", answer: "Once added to an active team, individual equipment issuance is locked until the project is completed. Use your Team ID for all team-related requests." },
              ]}
            />

            {/* Right: Best Practices */}
            <ImageRevealList
              title="Best Practices"
              className="lg:mt-0 lg:sticky lg:top-24"
              items={[
                { id: "1", number: "01", title: "Return hardware by the agreed due date" },
                { id: "2", number: "02", title: "Report any issues immediately to lab staff" },
                { id: "3", number: "03", title: "Keep hardware in its designated case" },
                { id: "4", number: "04", title: "Do not modify sealed components" },
                { id: "5", number: "05", title: "Clean equipment before return" },
                { id: "6", number: "06", title: "Ensure all accessories are returned" },
                { id: "7", number: "07", title: "Submit requests 48 hours in advance" },
                { id: "8", number: "08", title: "Use your Team ID for team requests" },
              ]}
            />
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-16 bg-muted/30 border-y border-border">
        <div className="container max-w-3xl text-center">
          <h2 className="font-display text-2xl font-bold text-foreground mb-4">About Equipra</h2>
          <p className="text-muted-foreground leading-relaxed">
            Equipra is a general-purpose academic platform designed to help universities and departments
            manage access to laboratory equipment for student projects, research, and innovation.
            It is not a commercial marketplace — all policies and control remain with the institution.
          </p>
        </div>
      </section>
    </>
  );
}
