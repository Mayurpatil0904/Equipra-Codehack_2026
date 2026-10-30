// frontend/src/lib/equipmentIcons.tsx
//
// Maps an equipment's category (free-text, admin-entered) to a Lucide
// icon component, so the UI shows consistent SVG icons instead of
// emoji characters. No backend/schema changes required — this is a
// purely presentational layer; the `emoji` field on Equipment is kept
// in the database but no longer used for rendering.

import {
  Cpu, Activity, Wrench, Printer, Bot, Radio, Wifi, Zap, Cog,
  FlaskConical, Camera, Code, Shield, CircuitBoard, Gauge,
  Package, Search, BatteryCharging, Microscope, Antenna,
  HardDrive, Box, Thermometer, Drill, Building2, Layers, Sparkles, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ✅ Explicit matches for categories already used in Equipra.
// Keys are lowercase; matching is done case-insensitively below.
const EXACT_MATCHES: Record<string, LucideIcon> = {
  "microcontrollers":        Cpu,
  "single board computers":  HardDrive,
  "measurement tools":       Activity,
  "workshop tools":          Wrench,
  "fabrication tools":       Printer,
  "debugging tools":         Search,
  "prototyping tools":       CircuitBoard,
  "power equipment":         BatteryCharging,
  "robotics components":     Bot,
  "sensors":                 Radio,
  "communication modules":   Antenna,
  "networking":              Wifi,
  "cross-lab bundles":      Layers,
  "shared spaces & benches": Building2,
  "shared spaces":          Building2,
};

// ✅ Fallback keyword matching — covers categories an admin might type
// that aren't an exact match above (e.g. "3D Printing Tools",
// "Power Supplies", "Microcontroller Boards").
const KEYWORD_MATCHES: [string, LucideIcon][] = [
  ["micro",      Cpu],
  ["board",      HardDrive],
  ["measur",     Activity],
  ["multimeter", Gauge],
  ["oscillo",    Activity],
  ["workshop",   Wrench],
  ["solder",     Drill],
  ["3d",         Printer],
  ["print",      Printer],
  ["fabricat",   Printer],
  ["debug",      Search],
  ["logic",      Search],
  ["prototyp",   CircuitBoard],
  ["breadboard", CircuitBoard],
  ["power",      BatteryCharging],
  ["battery",    BatteryCharging],
  ["robot",      Bot],
  ["motor",      Cog],
  ["sensor",     Radio],
  ["communicat", Antenna],
  ["network",    Wifi],
  ["wireless",   Wifi],
  ["chemical",   FlaskConical],
  ["lab",        FlaskConical],
  ["camera",     Camera],
  ["vision",     Camera],
  ["software",   Code],
  ["safety",     Shield],
  ["microscop",  Microscope],
  ["optic",      Zap],
  ["laser",      Zap],
  ["thermal",    Thermometer],
  ["temperature",Thermometer],
  ["bundle",     Layers],
  ["shared",     Building2],
  ["bench",      Building2],
  ["space",      Building2],
];

export function getEquipmentIcon(category?: string | null): LucideIcon {
  if (!category) return Package;
  const c = category.trim().toLowerCase();

  if (EXACT_MATCHES[c]) return EXACT_MATCHES[c];

  for (const [keyword, Icon] of KEYWORD_MATCHES) {
    if (c.includes(keyword)) return Icon;
  }

  return Box; // generic fallback for any unmatched category, distinct from "no category"
}

interface EquipmentIconProps {
  category?: string | null;
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: { wrap: "w-8 h-8",  icon: "h-4 w-4"  },
  md: { wrap: "w-10 h-10", icon: "h-5 w-5" },
  lg: { wrap: "w-14 h-14", icon: "h-7 w-7" },
};

// Renders the icon inside a soft circular background, matching the
// icon-chip pattern already used across Equipra (UniversityManagement,
// StatusBadge cards, feature cards, etc.)
export function EquipmentIcon({ category, className, iconClassName, size = "md" }: EquipmentIconProps) {
  const Icon = getEquipmentIcon(category);
  const sz = SIZE_MAP[size];

  return (
    <div className={cn(
      "rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0",
      sz.wrap, className
    )}>
      <Icon className={cn("text-primary", sz.icon, iconClassName)} />
    </div>
  );
}
