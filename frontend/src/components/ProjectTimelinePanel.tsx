// frontend/src/components/ProjectTimelinePanel.tsx
//
// Renders the project.timeline array (already returned by GET /api/projects/:id)
// as a vertical event log — device registrations, threshold alerts, etc.

import { AlertTriangle, Cpu, History, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEntry {
  id: string;
  event: string;
  description: string;
  createdAt: string;
}

function iconFor(event: string) {
  if (event === "ALERT") return AlertTriangle;
  if (event.toLowerCase().includes("device")) return Cpu;
  return Info;
}

function colorFor(event: string) {
  if (event === "ALERT") return "text-status-fault bg-status-fault/10";
  if (event.toLowerCase().includes("device")) return "text-primary bg-primary/10";
  return "text-muted-foreground bg-muted";
}

function fmtDateTime(d: string) {
  const date = new Date(d);
  const isToday = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return isToday ? `Today, ${time}` : `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${time}`;
}

export function ProjectTimelinePanel({ entries }: { entries: TimelineEntry[] }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <History className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No activity yet. Register a device to get started.</p>
      </div>
    );
  }

  const alertCount = entries.filter(e => e.event === "ALERT").length;

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Activity Timeline</h3>
        </div>
        {alertCount > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-status-fault/10 text-status-fault px-2 py-1 rounded-full">
            {alertCount} alert{alertCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="space-y-0 max-h-96 overflow-y-auto pr-1">
        {entries.map((entry, i) => {
          const Icon = iconFor(entry.event);
          return (
            <div key={entry.id} className="flex gap-3 pb-4 last:pb-0 relative">
              {i < entries.length - 1 && (
                <div className="absolute left-[13px] top-7 w-0.5 h-full bg-border" />
              )}
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10", colorFor(entry.event))}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", entry.event === "ALERT" ? "text-status-fault font-medium" : "text-foreground")}>
                  {entry.description}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{fmtDateTime(entry.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
