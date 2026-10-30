import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

export interface StaggeredFeature {
  icon: LucideIcon;
  title: string;
  desc: string;
  to: string;
}

export function StaggeredFeatureGrid({ features }: { features: StaggeredFeature[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {features.map((f, i) => {
        const Icon = f.icon;
        return (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
          >
            <Link
              to={f.to}
              className="group block h-full rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="icon-glow flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

export default StaggeredFeatureGrid;
