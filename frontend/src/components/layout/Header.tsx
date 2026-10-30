import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  Cpu,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  Bell,
  UserCircle,
  ChevronDown,
  ClipboardList,
  Users,
  Search,
} from "lucide-react";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch } from "@/components/GlobalSearch";

const studentLinks = [
  { to: "/", label: "Home" },
  { to: "/inventory", label: "Inventory" },
  { to: "/request", label: "Request" },
  { to: "/projects", label: "Projects" },
  { to: "/competitions", label: "Competitions" },
  { to: "/showcase", label: "Showcase" },
];

const facultyLinks = [
  { to: "/", label: "Home" },
  { to: "/faculty", label: "Dashboard" },
  { to: "/inventory", label: "Inventory" },
  { to: "/projects", label: "Projects" },
  { to: "/competitions", label: "Competitions" },
  { to: "/showcase", label: "Showcase" },
];

const adminLinks = [
  { to: "/", label: "Home" },
  { to: "/admin", label: "Dashboard" },
  { to: "/inventory", label: "Inventory" },
  { to: "/projects", label: "Projects" },
  { to: "/competitions", label: "Competitions" },
  { to: "/showcase", label: "Showcase" },
  { to: "/lab-analytics", label: "Lab Analytics" },
];

export function Header() {
  const {
    user,
    role,
    theme,
    toggleTheme,
    logout,
    feedbacks,
  } = useApp();

  const location = useLocation();

  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [userMenuOpen, setUserMenuOpen] =
    useState(false);

  const [showSearch, setShowSearch] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const handleSpotlight = (e: React.MouseEvent<HTMLElement>) => {
    const el = headerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  };

  const links =
    role === "admin"
      ? adminLinks
      : role === "faculty"
      ? facultyLinks
      : studentLinks;

  const unreadFeedback = feedbacks.filter(
    (f) => !f.read
  ).length;

  const initials =
    user?.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  // Close all dropdowns on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Ctrl+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
    <header
      ref={headerRef}
      onMouseMove={handleSpotlight}
      className="spotlight-nav sticky top-0 z-50 w-full border-b border-border/60 glass-nav header-gradient-border"
    >
      <div className="container flex h-16 items-center justify-between gap-4">

        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group flex-shrink-0"
          aria-label="Equipra Home"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <Cpu className="h-5 w-5" />
          </div>

          <div className="hidden sm:block">
            <div className="font-display font-bold text-lg text-foreground leading-none">
              Equipra
            </div>

            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
              {user?.college ?? "Academic Platform"}
            </div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "px-3.5 py-2 rounded-md text-sm font-medium transition-colors",

                location.pathname === link.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">

          {/* Search */}
          <button
            onClick={() => setShowSearch(true)}
            className="h-9 w-9 rounded-lg border border-border bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Search (Ctrl+K)"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg border border-border bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={
              theme === "dark"
                ? "Light mode"
                : "Dark mode"
            }
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Notification Bell */}
          <NotificationBell />

          {/* Feedback Bell */}
          {role === "admin" &&
            unreadFeedback > 0 && (
              <Link
                to="/admin"
                className="relative h-9 w-9 rounded-lg border border-border bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Bell className="h-4 w-4" />

                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-status-fault text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadFeedback}
                </span>
              </Link>
            )}

          {/* User Dropdown */}
          <div className="hidden sm:block relative">
            <button
              onClick={() =>
                setUserMenuOpen((o) => !o)
              }
              className="flex items-center gap-2 pl-2 border-l border-border hover:opacity-80 transition-opacity"
            >
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                {initials}
              </div>

              <div className="hidden md:block text-left">
                <div className="text-sm font-semibold text-foreground leading-none">
                  {user?.name}
                </div>

                <div className="text-[10px] text-muted-foreground capitalize mt-0.5">
                  {role}
                </div>
              </div>

              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform",
                  userMenuOpen && "rotate-180"
                )}
              />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() =>
                    setUserMenuOpen(false)
                  }
                />

                <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">

                  <div className="px-4 py-3 border-b border-border bg-muted/30">
                    <p className="text-sm font-semibold text-foreground">
                      {user?.name}
                    </p>

                    <p className="text-xs text-muted-foreground mt-0.5">
                      {user?.department}
                    </p>
                  </div>

                  <div className="p-1.5">

                    <Link
                      to="/profile"
                      onClick={() =>
                        setUserMenuOpen(false)
                      }
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      My Profile & Password
                    </Link>

                    <Link
                      to="/my-requests"
                      onClick={() =>
                        setUserMenuOpen(false)
                      }
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      My Requests
                    </Link>

                    <Link
                      to="/teams"
                      onClick={() =>
                        setUserMenuOpen(false)
                      }
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Users className="h-4 w-4 text-muted-foreground" />
                      My Teams
                    </Link>

                    <div className="my-1 border-t border-border" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-status-fault hover:bg-status-fault/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Log Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="lg:hidden h-9 w-9 rounded-lg border border-border bg-muted/50 flex items-center justify-center"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() =>
              setMobileOpen((o) => !o)
            }
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <>
        <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setMobileOpen(false)} />
        <nav className="lg:hidden border-t border-border bg-card p-4 animate-fade-in relative z-40 max-h-[calc(100vh-4rem)] overflow-y-auto">

          <div className="flex flex-col gap-1">

            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() =>
                  setMobileOpen(false)
                }
                className={cn(
                  "px-4 py-3 rounded-md text-sm font-medium transition-colors",

                  location.pathname === link.to
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            ))}

            <Link
              to="/profile"
              onClick={() =>
                setMobileOpen(false)
              }
              className="px-4 py-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-2"
            >
              <UserCircle className="h-4 w-4" />
              My Profile
            </Link>

            <Link
              to="/my-requests"
              onClick={() =>
                setMobileOpen(false)
              }
              className="px-4 py-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-2"
            >
              <ClipboardList className="h-4 w-4" />
              My Requests
            </Link>

            <Link
              to="/teams"
              onClick={() =>
                setMobileOpen(false)
              }
              className="px-4 py-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              My Teams
            </Link>

            <button
              onClick={handleLogout}
              className="px-4 py-3 rounded-md text-sm font-medium text-status-fault hover:bg-status-fault/10 text-left flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </nav>
        </>
      )}
    </header>

    {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
    </>
  );
}