// ─── Auth ──────────────────────────────────────────────────────
export type Role = "student" | "faculty" | "admin" | null;

export interface User {
  id: string;
  name: string;
  role: NonNullable<Role>;
  department: string;
  college: string;
  canManageAdmins?: boolean;
}

// ─── Hardware ──────────────────────────────────────────────────
export type AvailabilityStatus = "available" | "issued" | "reserved" | "maintenance" | "inspection";
export type FaultScanStatus =
  | "not-scanned"
  | "scanned-ok-before"
  | "scanned-ok-after"
  | "fault-detected"
  | "fault-evaluation";

export interface TimelineEntry {
  date: string;
  status: "success" | "pending" | "warning" | "error";
  description: string;
}

export interface HardwareItem {
  id: string;
  name: string;
  category: string;
  description: string;
  typicalUses: string[];
  labLocation: string;
  supervisor: string;
  availabilityStatus: AvailabilityStatus;
  faultScanStatus: FaultScanStatus;
  conditionLog: string;
  lastIssuedTo?: string;
  returnDate?: string;
  timeline: TimelineEntry[];
  emoji: string;
}

// ─── Requests ─────────────────────────────────────────────────
export type RequestStatus =
  | "pending_faculty"
  | "pending_lab"
  | "approved"
  | "rejected"
  | "issued"
  | "returned"
  | "returned_pending_inspection";

export interface RequestMessage {
  from: "me" | "lab" | "faculty";
  text: string;
  time: string;
  senderName?: string;
}

export interface EquipmentRequest {
  id: string;
  itemId: string;
  itemName: string;
  project: string;
  purpose: string;
  professorId: string;
  professorName: string;
  dateFrom: string;
  dateTo: string;
  status: RequestStatus;
  type: "individual" | "team";
  teamId?: string;
  studentId: string;
  studentName: string;
  messages: RequestMessage[];
  createdAt: string;
  // ✅ NEW — needed for QR collection pass + return inspection
  requestCode?: string;
  qrToken?: string | null;
  equipment?: any;
  student?: any;
  faculty?: any;
  conditionRating?: number | null;
  damageNotes?: string | null;
  damagePercent?: number | null;
  issuedAt?: string | null;
  returnedAt?: string | null;
  isPriorityPassUsed?: boolean;
  pointsBurned?: number;
  studentTrust?: any;
}

// ─── Teams ────────────────────────────────────────────────────
export interface TeamMember {
  id: string;
  name: string;
  role: "Leader" | "Member";
}

export interface Team {
  id: string;
  name: string;
  project: string;
  professorId: string;
  professorName: string;
  members: TeamMember[];
  active: boolean;
  createdAt: string;
}

// ─── Feedback ─────────────────────────────────────────────────
export interface FeedbackEntry {
  id: string;
  department: string;
  type: string;
  message: string;
  rating: number;
  submittedBy: string;
  submittedByName: string;
  role: string;
  createdAt: string;
  read: boolean;
}

// ─── Messages ─────────────────────────────────────────────────
export interface MessageThread {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: string;
  messages: RequestMessage[];
}
