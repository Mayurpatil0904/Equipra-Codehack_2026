import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, X, ClipboardList, MessageSquare, Users, Cpu } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

const TYPE_ICONS: Record<string, typeof Bell> = {
  request_update: ClipboardList,
  message: MessageSquare,
  team: Users,
  device: Cpu,
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { role } = useApp();
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const load = useCallback(async () => {
    try {
      const data = await notificationsApi.list();
      setNotifications(data ?? []);
    } catch { /* ignore */ }
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  // Position dropdown below bell button
  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [open]);

  // Close on click outside — uses capture phase for reliability
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    // Small delay to avoid the opening click from immediately closing
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClick, true);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClick, true);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const unread = notifications.filter(n => !n.isRead).length;

  const markRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // Dropdown rendered via portal at document.body level — escapes all stacking contexts
  const dropdown = open ? createPortal(
    <div
      ref={dropdownRef}
      className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in"
      style={{
        position: "fixed",
        top: pos.top,
        right: pos.right,
        width: 320,
        zIndex: 9999,
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unread > 0 && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              {unread} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button
              onClick={markAllRead}
              disabled={loading}
              className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary/5 transition-colors"
              title="Mark all read"
            >
              <CheckCheck className="h-3 w-3" />
              All read
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[380px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-10 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          notifications.slice(0, 20).map(n => {
            const Icon = TYPE_ICONS[n.type] ?? Bell;
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 border-b border-border/50 transition-colors cursor-pointer hover:bg-muted/30",
                  !n.isRead && "bg-primary/[0.03]"
                )}
                onClick={() => { if (!n.isRead) markRead(n.id); }}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                  !n.isRead ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-xs leading-tight", !n.isRead ? "font-semibold text-foreground" : "text-muted-foreground")}>
                      {n.title}
                    </p>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-center">
          <Link
            to={role === "admin" ? "/admin" : "/my-requests"}
            onClick={() => setOpen(false)}
            className="text-xs text-primary hover:text-primary/80 font-medium"
          >
            View all activity →
          </Link>
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        className="relative h-9 w-9 rounded-lg border border-border bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {dropdown}
    </>
  );
}
