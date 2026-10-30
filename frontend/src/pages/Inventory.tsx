import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Filter, Loader2, ScanLine, Plus, Sparkles, Building2, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { HardwareCard } from "@/components/HardwareCard";
import { equipmentApi } from "@/lib/api";
import { hardwareData } from "@/data/hardwareData";

const STATUSES = ["All", "Available", "Issued", "Reserved", "Maintenance"];

export default function Inventory() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("cat") || "All";

  const [search,    setSearch]    = useState("");
  const [category,  setCategory]  = useState(initialCategory);
  const [status,    setStatus]    = useState("All");
  const [items,     setItems]     = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  // Update category when query param changes
  useEffect(() => {
    const qCat = searchParams.get("cat");
    if (qCat) setCategory(qCat);
  }, [searchParams]);

  // Load equipment from backend with seamless fallback to rich mock data
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [equip, cats] = await Promise.all([
          equipmentApi.list(),
          equipmentApi.categories(),
        ]);
        if (equip && equip.length > 0) {
          setItems(equip);
          setCategories(["All", ...cats]);
        } else {
          setItems(hardwareData);
          const allCats = Array.from(new Set(hardwareData.map(h => h.category)));
          setCategories(["All", ...allCats]);
        }
      } catch (err) {
        console.warn("Backend API not reachable, loading local hardware catalog:", err);
        setItems(hardwareData);
        const allCats = Array.from(new Set(hardwareData.map(h => h.category)));
        setCategories(["All", ...allCats]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    const matchSearch   = !q
      || item.name?.toLowerCase().includes(q)
      || item.category?.toLowerCase().includes(q)
      || item.description?.toLowerCase().includes(q)
      || (item.labLocation && item.labLocation.toLowerCase().includes(q));
    const matchCategory = category === "All" || item.category === category;
    const matchStatus   = status   === "All" || item.availabilityStatus === status.toLowerCase();
    return matchSearch && matchCategory && matchStatus;
  });

  return (
    <>
      <section className="bg-muted/20 border-b border-border/60 py-10">
        <motion.div
          className="container"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                  Shared Institutional Resources
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                  Dual-Lab Supervision
                </span>
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-1.5">Institutional Catalog</h1>
              <p className="text-muted-foreground text-[15px] max-w-2xl">
                Browse standalone sensors, shared specialized testing bays, and multi-department collaborative equipment bundles.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link to="/request"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors duration-200 shadow-sm">
                <Plus className="h-4 w-4" />
                Request Resource
              </Link>
              <Link to="/fault-scan"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-semibold hover:bg-muted transition-colors duration-200">
                <ScanLine className="h-4 w-4" />
                Fault Scanner
              </Link>
            </div>
          </div>

          {/* Quick-Filter Highlighting Tags */}
          <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-border/40">
            <button
              type="button"
              onClick={() => setCategory("All")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                category === "All"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              All Resources ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setCategory("Cross-Lab Bundles")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                category === "Cross-Lab Bundles"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Cross-Lab Bundles
            </button>
            <button
              type="button"
              onClick={() => setCategory("Shared Spaces & Benches")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                category === "Shared Spaces & Benches"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Shared Spaces & Benches
            </button>
          </div>
        </motion.div>
      </section>

      {/* Sticky filters */}
      <div className="sticky top-16 z-40 glass-nav border-b border-border/60 py-3">
        <div className="container flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by equipment, lab, room, or space..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto flex-1 sm:flex-initial">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="pl-8 pr-8 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer min-w-0 w-full sm:min-w-[180px] sm:w-auto"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer min-w-0 w-full sm:min-w-[130px] sm:w-auto"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {category === "Cross-Lab Bundles" && (
              <div className="mb-6 p-4 rounded-xl border border-border bg-card flex items-start gap-3 shadow-xs">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <span>Cross-Department Equipment Bundles</span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">Co-Hosted</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Pooled resource packages co-maintained between ECE, Mechatronics, Photonics, and IoT laboratories. By sharing high-end test hardware, departments eliminate redundant purchases and give multi-disciplinary teams access under a unified dual-lab approval workflow.
                  </p>
                </div>
              </div>
            )}

            {category === "Shared Spaces & Benches" && (
              <div className="mb-6 p-4 rounded-xl border border-border bg-card flex items-start gap-3 shadow-xs">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <span>Shared Testing Bays & Specialized Benches</span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">Bookable Facility</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Institutional testing cleanrooms, optical darkroom bays, UAV flight cages, and SMD rework stations. Reserving a slot grants verified student teams supervised access with on-bench equipment and safety clearance.
                  </p>
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground mb-5">
              Showing {filtered.length} of {items.length} resources
            </p>

            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((item, i) => (
                  <motion.div
                    key={item.id ?? item.slug}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    viewport={{ once: true }}
                  >
                    <HardwareCard item={item} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg mb-4">
                  {items.length === 0
                    ? "No equipment has been added to the inventory yet."
                    : "No resources match your filters."}
                </p>
                {items.length > 0 && (
                  <button
                    onClick={() => { setSearch(""); setCategory("All"); setStatus("All"); }}
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
