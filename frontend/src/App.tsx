import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppProvider, useApp } from "@/context/AppContext";
import { Toaster } from "sonner";
import { Suspense, lazy } from "react";

import { MainLayout } from "@/components/layout/MainLayout";
import { KineticTextLoader } from "@/components/effects/KineticTextLoader";

// Eager-loaded (common entry points)
import Login from "@/pages/Login";
import Home from "@/pages/Home";

// Lazy-loaded (loaded on-demand when navigated to)
const Inventory = lazy(() => import("@/pages/Inventory"));
const HardwareDetail = lazy(() => import("@/pages/HardwareDetail"));
const RequestIssue = lazy(() => import("@/pages/RequestIssue"));
const MyRequests = lazy(() => import("@/pages/MyRequests"));
const Messages = lazy(() => import("@/pages/Messages"));
const Teams = lazy(() => import("@/pages/Teams"));
const FaultScan = lazy(() => import("@/pages/FaultScan"));
const Guidelines = lazy(() => import("@/pages/Guidelines"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const FacultyDashboard = lazy(() => import("@/pages/FacultyDashboard"));
const Profile = lazy(() => import("@/pages/Profile"));
const ScanRedirect = lazy(() => import("@/pages/ScanRedirect"));
const Projects = lazy(() => import("@/pages/Projects"));
const ProjectDashboard = lazy(() => import("@/pages/ProjectDashboard"));
const AnalyticsDashboard = lazy(() => import("@/pages/AnalyticsDashboard"));
const Competitions = lazy(() => import("@/pages/Competitions"));
const LabAnalytics = lazy(() => import("@/pages/LabAnalytics"));
const ProjectShowcase = lazy(() => import("@/pages/ProjectShowcase"));
const ProjectPortfolio = lazy(() => import("@/pages/ProjectPortfolio"));
const VibrometerTelemetry = lazy(() => import("@/pages/VibrometerTelemetry"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <KineticTextLoader />
    </div>
  );
}

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const { role, loading } = useApp();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!role) {
    // ✅ Pass the intended destination as BOTH location.state AND a ?from=
    // query param. location.state only works for in-app navigation; the
    // query param survives when a phone camera opens the URL in a fresh tab.
    const fromPath = location.pathname + location.search;
    return (
      <Navigate
        to={`/login?from=${encodeURIComponent(fromPath)}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { role, loading } = useApp();

  if (loading) return <LoadingScreen />;

  return (
    <Suspense fallback={<LoadingScreen />}>
    <Routes>
      <Route
        path="/login"
        element={
          role ? (
            <Navigate
              to={
                role === "admin"
                  ? "/admin"
                  : role === "faculty"
                  ? "/faculty"
                  : "/"
              }
              replace
            />
          ) : (
            <Login />
          )
        }
      />

      <Route
        element={
          <ProtectedRoute
            allowedRoles={["student", "faculty", "admin"]}
          >
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />

        <Route path="/inventory" element={<Inventory />} />

        <Route
          path="/hardware/:id"
          element={<HardwareDetail />}
        />

        <Route path="/fault-scan" element={<FaultScan />} />

        <Route path="/guidelines" element={<Guidelines />} />

        <Route path="/messages" element={<Messages />} />

        <Route path="/teams" element={<Teams />} />

        <Route path="/profile" element={<Profile />} />

        {/* ✅ NEW — Collection-pass QR code lands here */}
        <Route path="/scan/:token" element={<ScanRedirect />} />

        {/* ✅ NEW — IoT Projects module */}
        <Route path="/projects"     element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDashboard />} />
        <Route path="/projects/:projectId/analytics" element={<AnalyticsDashboard />} />
        <Route path="/competitions" element={<Competitions />} />
        <Route
          path="/lab-analytics"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <LabAnalytics />
            </ProtectedRoute>
          }
        />
        <Route path="/showcase"     element={<ProjectShowcase />} />
        <Route path="/showcase/:id" element={<ProjectPortfolio />} />

        {/* 🔬 NEW — Physical Hardware Telemetry & Optical Laser Vibrometer */}
        <Route path="/dashboard/instruments/vibrometer" element={<VibrometerTelemetry />} />
        <Route path="/vibrometer" element={<VibrometerTelemetry />} />
        <Route path="/telemetry" element={<VibrometerTelemetry />} />

        {/* REQUEST ROUTES */}
        <Route
          path="/request"
          element={
            <ProtectedRoute
              allowedRoles={["student", "faculty"]}
            >
              <RequestIssue />
            </ProtectedRoute>
          }
        />

        <Route
          path="/request/:id"
          element={
            <ProtectedRoute
              allowedRoles={["student", "faculty"]}
            >
              <RequestIssue />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-requests"
          element={
            <ProtectedRoute
              allowedRoles={["student", "faculty"]}
            >
              <MyRequests />
            </ProtectedRoute>
          }
        />

        {/* FACULTY */}
        <Route
          path="/faculty"
          element={
            <ProtectedRoute allowedRoles={["faculty"]}>
              <FacultyDashboard />
            </ProtectedRoute>
          }
        />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />

        <Toaster
          richColors
          position="bottom-right"
          closeButton
        />
      </BrowserRouter>
    </AppProvider>
  );
}