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

        {/* Card Body with Name, Details and Request Button */}
        <div className="flex flex-col flex-1 p-4 gap-2.5">
          <div>
            <h3 className="font-semibold text-[15px] text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2 leading-snug">
              {item.name}
            </h3>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <StatusBadge type="availability" status={item.availabilityStatus} />
            {item.faultScanStatus && <StatusBadge type="fault" status={item.faultScanStatus} />}
            {isIssuedOrFull && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                <Clock className="h-3 w-3" />
                Waitlist Open
              </span>
            )}
          </div>

          <div className="space-y-1 text-[13px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
              <span className="truncate">{item.labLocation}</span>
            </div>
            {item.returnDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
                <span>Return: {item.returnDate}</span>
              </div>
            )}
            {item.lastIssuedTo && (
              <div className="text-xs font-mono truncate opacity-70">
                Issued to: {item.lastIssuedTo}
              </div>
            )}
          </div>

          {item.conditionLog && (
            <p className="text-xs text-muted-foreground/80 line-clamp-2 border-t border-border/40 pt-2.5 mt-auto">
              {item.conditionLog}
            </p>
          )}

          {/* Action Row: Request / Waitlist Button + Details Link */}
          <div className="mt-auto pt-3 flex items-center gap-2 border-t border-border/40">
            <Link
              to={`/request?item=${urlKey}`}
              onClick={e => e.stopPropagation()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors duration-200 shadow-xs"
            >
              {item.availabilityStatus === "available" ? "Request Equipment →" : "Join Waitlist →"}
            </Link>
            <div className="flex items-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors duration-200 gap-0.5 px-2 py-2">
              Details
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>

      </div>
    </Link>
  );
}
