import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Package, Users, FolderKanban, Users2, Loader2, ArrowRight } from "lucide-react";
import { searchApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props { onClose: () => void; }

export function GlobalSearch({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<any>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults(null); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try { setResults(await searchApi.search(q)); }
      catch { setResults(null); }
      finally { setLoading(false); }
    }, 300);
  }, []);

  useEffect(() => { doSearch(query); }, [query, doSearch]);

  // Build flat list for keyboard nav
  const items: { type: string; label: string; sub: string; href?: string }[] = [];
  if (results) {
    results.equipment?.forEach((e: any) => items.push({ type: "equipment", label: e.name, sub: `${e.category} · ${e.equipmentId}`, href: `/hardware/${e.slug}` }));
    results.users?.forEach((u: any) => items.push({ type: "user", label: u.name, sub: `${u.role} · ${u.department}` }));
    results.projects?.forEach((p: any) => items.push({ type: "project", label: p.name, sub: `${p.projectType} · ${p.status}`, href: "/projects" }));
    results.teams?.forEach((t: any) => items.push({ type: "team", label: t.name, sub: t.teamId, href: "/teams" }));
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, items.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && items[selectedIdx]?.href) {
      navigate(items[selectedIdx].href!);
      onClose();
    }
  };

  const iconMap: Record<string, any> = { equipment: Package, user: Users, project: FolderKanban, team: Users2 };
  const colorMap: Record<string, string> = { equipment: "text-primary", user: "text-emerald-500", project: "text-amber-500", team: "text-violet-500" };

  return (
    <div className="fixed inset-0 z-[400] flex items-start justify-center pt-[15vh] p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg overflow-hidden" onKeyDown={handleKeyDown}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
            placeholder="Search equipment, users, projects, teams…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <kbd className="hidden sm:inline text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono">ESC</kbd>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {items.length > 0 ? (
            <div className="py-2">
              {items.map((item, idx) => {
                const Icon = iconMap[item.type] || Package;
                return (
                  <button key={`${item.type}-${idx}`}
                    onClick={() => { if (item.href) { navigate(item.href); onClose(); } }}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      selectedIdx === idx ? "bg-primary/10" : "hover:bg-muted/50",
                      !item.href && "cursor-default"
                    )}>
                    <Icon className={cn("h-4 w-4 shrink-0", colorMap[item.type])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.sub}</p>
                    </div>
                    {item.href && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                  </button>
                );
              })}
            </div>
          ) : query.length >= 2 && !loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No results for "{query}"</p>
            </div>
          ) : !query ? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-xs">Start typing to search across everything</p>
              <div className="flex items-center justify-center gap-4 mt-3 text-[10px]">
                <span className="flex items-center gap-1"><Package className="h-3 w-3" />Equipment</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />Users</span>
                <span className="flex items-center gap-1"><FolderKanban className="h-3 w-3" />Projects</span>
                <span className="flex items-center gap-1"><Users2 className="h-3 w-3" />Teams</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}
