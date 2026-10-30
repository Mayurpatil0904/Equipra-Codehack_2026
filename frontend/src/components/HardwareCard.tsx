import { Link } from "react-router-dom";
import { MapPin, Calendar, ArrowRight, Sparkles, Building2, Clock } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { useApp } from "@/context/AppContext";
import { getEquipmentIcon } from "@/lib/equipmentIcons";

interface Props {
  item: any; // accepts both hardwareData shape and DB shape
}

export function HardwareCard({ item }: Props) {
  const { role } = useApp();
  // DB uses `slug` as the URL key; legacy hardwareData uses `id`
  const urlKey = item.slug ?? item.id;
  const Icon = getEquipmentIcon(item.category);

  const isCrossLabBundle = item.category === "Cross-Lab Bundles";
  const isSharedSpace = item.category === "Shared Spaces & Benches";
  const isIssuedOrFull = item.availabilityStatus === "issued" || item.availableUnits === 0;

  return (
    <Link to={`/hardware/${urlKey}`} className="group block h-full">
      <div className="h-full flex flex-col bg-card rounded-xl border border-border/50 overflow-hidden transition-all duration-200 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:border-primary/30 dark:hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)]">

        {/* Equipment image or category icon thumbnail */}
        <div className="relative h-44 flex items-center justify-center bg-gradient-to-br from-muted/40 to-muted/20 overflow-hidden select-none">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Icon className="h-14 w-14 text-primary/60 transition-colors duration-200 group-hover:text-primary/80" strokeWidth={1.5} />
            </div>
          )}

          {/* Category badge overlay */}
          <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 rounded-md px-2 py-0.5 backdrop-blur-sm">
            {item.category}
          </span>

          {/* Special badges for Cross-Lab Bundles or Shared Spaces */}
          {isCrossLabBundle && (
            <span className="absolute top-3 right-3 text-[10px] font-semibold tracking-wide text-foreground bg-background/90 border border-border rounded-md px-2 py-0.5 backdrop-blur-sm flex items-center gap-1 shadow-xs">
              <Sparkles className="h-3 w-3 text-muted-foreground" />
              Multi-Lab Bundle
            </span>
          )}

          {isSharedSpace && (
            <span className="absolute top-3 right-3 text-[10px] font-semibold tracking-wide text-foreground bg-background/90 border border-border rounded-md px-2 py-0.5 backdrop-blur-sm flex items-center gap-1 shadow-xs">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              Shared Facility
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
