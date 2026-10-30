// frontend/src/context/AppContext.tsx
// UPDATED — canManageAdmins added to User object on login and me()

import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode,
} from "react";
import { authApi, token, requestsApi, teamsApi, feedbackApi, messagesApi } from "@/lib/api";
import type { Role, User, EquipmentRequest, Team, FeedbackEntry, MessageThread, RequestStatus } from "@/types";

interface AppContextType {
  user: User | null; role: Role; loading: boolean;
  login:  (enrollmentId: string, password: string, collegeName: string, role: string) => Promise<void>;
  logout: () => void;
  theme: "light" | "dark"; toggleTheme: () => void;
  requests: EquipmentRequest[]; requestsLoading: boolean;
  fetchRequests: () => Promise<void>;
  addRequest: (r: any) => Promise<void>;
  updateRequestStatus: (id: string, status: RequestStatus) => Promise<void>;
  addMessageToRequest: (reqId: string, msg: any) => Promise<void>;
  teams: Team[]; teamsLoading: boolean;
  fetchTeams: () => Promise<void>;
  addTeam: (d: { name: string; project: string }) => Promise<void>;
  deactivateTeam: (code: string) => Promise<void>;
  feedbacks: FeedbackEntry[]; fetchFeedbacks: () => Promise<void>;
  addFeedback: (f: any) => Promise<void>;
  markFeedbackRead: (id: string) => Promise<void>;
  messageThreads: MessageThread[];
  fetchThreads: () => Promise<void>;
  addMessageToThread: (partnerId: string, text: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function mapRequest(r: any): EquipmentRequest {
  return {
    id: r.id, itemId: r.equipment?.slug ?? "", itemName: r.equipment?.name ?? "",
    project: r.project, purpose: r.purpose,
    professorId: r.facultyId, professorName: r.faculty?.name ?? "",
    dateFrom: r.dateFrom?.slice(0,10) ?? "", dateTo: r.dateTo?.slice(0,10) ?? "",
    status: r.status, type: r.type, teamId: r.team?.teamCode,
    studentId: r.student?.id ?? r.studentId,
    studentEnrollmentId: r.student?.enrollmentId ?? "",
    studentName: r.student?.name ?? "",
    messages: (r.messages ?? []).map((m: any) => ({
      from: m.sender === "student" ? "me" : m.sender,
      text: m.text,
      time: new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      senderName: m.sentBy?.name,
    })),
    createdAt: r.createdAt?.slice(0,10) ?? "",
    // ✅ NEW — needed by CollectionPass (QR code, request code, full nested objects)
    requestCode: r.requestCode,
    qrToken: r.qrToken,
    equipment: r.equipment,
    student: r.student,
    faculty: r.faculty,
    conditionRating: r.conditionRating,
    damageNotes: r.damageNotes,
    damagePercent: r.damagePercent,
    issuedAt: r.issuedAt,
    returnedAt: r.returnedAt,
    isPriorityPassUsed: r.isPriorityPassUsed ?? false,
    pointsBurned: r.pointsBurned ?? 0,
    studentTrust: r.studentTrust ?? null,
  } as any;
}

function mapTeam(t: any): Team {
  return {
    id: t.teamCode, name: t.name, project: t.project,
    professorId: t.professorId, professorName: t.professor?.name ?? "",
    members: (t.members ?? []).map((m: any) => ({ id: m.user?.enrollmentId ?? "", name: m.user?.name ?? "", role: m.role })),
    active: t.active, createdAt: t.createdAt?.slice(0,10) ?? "",
  };
}

function mapFeedback(f: any): FeedbackEntry {
  return {
    id: f.id, department: f.department, type: f.type, message: f.message,
    rating: f.rating, submittedBy: f.submittedById,
    submittedByName: f.submittedBy?.name ?? "",
    role: (f.submittedBy?.role ?? "student").toLowerCase(),
    createdAt: f.createdAt, read: f.isRead,
  };
}

function mapThreads(data: any[], myId: string): MessageThread[] {
  return data.map((t: any) => ({
    id: t.partner?.id ?? "", participantId: t.partner?.id ?? "",
    participantName: t.partner?.name ?? "", participantRole: t.partner?.role ?? "",
    unreadCount: t.unreadCount ?? 0,
    messages: t.latestMessage ? [{
      from: t.latestMessage.senderId === myId ? "me" as const : "lab" as const,
      text: t.latestMessage.text,
      time: new Date(t.latestMessage.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      senderName: t.partner?.name,
    }] : [],
  }));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user,            setUser]           = useState<User | null>(null);
  const [role,            setRole]           = useState<Role>(null);
  const [loading,         setLoading]        = useState(true);
  const [theme,           setTheme]          = useState<"light" | "dark">("light");
  const [requests,        setRequests]       = useState<EquipmentRequest[]>([]);
  const [requestsLoading, setRequestsLoading]= useState(false);
  const [teams,           setTeams]          = useState<Team[]>([]);
  const [teamsLoading,    setTeamsLoading]   = useState(false);
  const [feedbacks,       setFeedbacks]      = useState<FeedbackEntry[]>([]);
  const [messageThreads,  setThreads]        = useState<MessageThread[]>([]);

  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);

  // Auto-login on refresh
  useEffect(() => {
    const t = token.get();
    if (!t) { setLoading(false); return; }
    authApi.me()
      .then(u => {
        setUser({
          id:              u.id,
          name:            u.name,
          role:            u.role.toLowerCase() as any,
          department:      u.department,
          college:         u.college,
          canManageAdmins: u.canManageAdmins ?? false, // ✅
        });
        setRole(u.role.toLowerCase() as Role);
      })
      .catch(() => token.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = async (enrollmentId: string, password: string, collegeName: string, roleStr: string) => {
    const { token: jwt, user: u } = await authApi.login({ enrollmentId, password, collegeName, role: roleStr.toUpperCase() });
    token.set(jwt);
    const mapped: User = {
      id:              u.id,
      name:            u.name,
      role:            u.role.toLowerCase() as any,
      department:      u.department,
      college:         u.college,
      canManageAdmins: u.canManageAdmins ?? false, // ✅
    };
    setUser(mapped);
    setRole(mapped.role);
  };

  const logout = () => {
    token.clear(); setUser(null); setRole(null);
    setRequests([]); setTeams([]); setFeedbacks([]); setThreads([]);
  };

  const toggleTheme = () => setTheme(t => t === "light" ? "dark" : "light");

  const fetchRequests = useCallback(async () => {
    if (!role) return;
    setRequestsLoading(true);
    try { setRequests((await requestsApi.list()).map(mapRequest)); }
    finally { setRequestsLoading(false); }
  }, [role]);
  useEffect(() => { if (role) fetchRequests(); }, [role, fetchRequests]);

  const addRequest          = async (d: any)                             => { await requestsApi.create(d); await fetchRequests(); };
  const updateRequestStatus = async (_id: string, _status: RequestStatus) => { await fetchRequests(); };
  const addMessageToRequest = async (_reqId: string, _msg: any)          => { await fetchRequests(); };

  const fetchTeams = useCallback(async () => {
    if (!role) return;
    setTeamsLoading(true);
    try { setTeams((await teamsApi.list()).map(mapTeam)); }
    finally { setTeamsLoading(false); }
  }, [role]);
  useEffect(() => { if (role) fetchTeams(); }, [role, fetchTeams]);

  const addTeam       = async (d: { name: string; project: string }) => { await teamsApi.create(d); await fetchTeams(); };
  const deactivateTeam = async (code: string)                         => { await teamsApi.deactivate(code); await fetchTeams(); };

  const fetchFeedbacks = useCallback(async () => {
    if (role !== "admin") return;
    try { setFeedbacks((await feedbackApi.list()).map(mapFeedback)); } catch {}
  }, [role]);
  useEffect(() => { if (role === "admin") fetchFeedbacks(); }, [role, fetchFeedbacks]);

  const addFeedback      = async (f: any)      => { await feedbackApi.submit(f); await fetchFeedbacks(); };
  const markFeedbackRead = async (id: string)  => { await feedbackApi.markRead(id); await fetchFeedbacks(); };

  const fetchThreads = useCallback(async () => {
    if (!role || !user) return;
    try { setThreads(mapThreads(await messagesApi.threads(), user.id)); } catch {}
  }, [role, user]);
  useEffect(() => { if (role && user) fetchThreads(); }, [role, user, fetchThreads]);

  const addMessageToThread = async (partnerId: string, text: string) => {
    await messagesApi.send(partnerId, text); await fetchThreads();
  };

  return (
    <AppContext.Provider value={{
      user, role, loading, login, logout, theme, toggleTheme,
      requests, requestsLoading, fetchRequests, addRequest, updateRequestStatus, addMessageToRequest,
      teams, teamsLoading, fetchTeams, addTeam, deactivateTeam,
      feedbacks, fetchFeedbacks, addFeedback, markFeedbackRead,
      messageThreads, fetchThreads, addMessageToThread,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
