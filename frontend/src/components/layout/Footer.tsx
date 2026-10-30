// Footer.tsx
import { Cpu } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-muted/30 py-8 mt-auto relative">
      <div className="gradient-divider absolute top-0 left-0 right-0" />
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Cpu className="h-4 w-4" />
          <span className="text-sm font-semibold">Equipra</span>
        </div>
        <p className="text-xs text-center text-muted-foreground max-w-md">
          Equipra is a centralized platform for managing laboratory hardware,
          improving visibility, accountability, and resource utilization across
          academic environments.
        </p>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Equipra. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
