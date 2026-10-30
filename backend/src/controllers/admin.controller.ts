// src/controllers/admin.controller.ts
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok, created, notFound, badRequest, forbidden } from "../lib/response";
import bcrypt from "bcryptjs";
import { z } from "zod";
import * as XLSX from "xlsx";
import fs from "fs";

// GET /api/admin/stats
export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const requester = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    const isSuperAdmin = requester?.canManageAdmins ?? false;
    const userCollegeFilter = !isSuperAdmin ? { collegeId: req.user!.collegeId } : {};

    const [
      totalEquipment,
      availableEquipment,
      issuedEquipment,
      maintenanceEquipment,
      totalRequests,
      pendingFaculty,
      pendingLab,
      approvedRequests,
      rejectedRequests,
      activeTeams,
      totalStudents,
      totalFaculty,
      unreadFeedback,
      recentRequests,
      recentScans,
    ] = await Promise.all([
      prisma.equipment.count({ where: { isActive: true } }),
      prisma.equipment.count({ where: { isActive: true, availabilityStatus: "available" } }),
      prisma.equipment.count({ where: { isActive: true, availabilityStatus: "issued" } }),
      prisma.equipment.count({ where: { isActive: true, availabilityStatus: "maintenance" } }),
      prisma.equipmentRequest.count(),
      prisma.equipmentRequest.count({ where: { status: "pending_faculty" } }),
      prisma.equipmentRequest.count({ where: { status: "pending_lab" } }),
      prisma.equipmentRequest.count({ where: { status: "approved" } }),
      prisma.equipmentRequest.count({ where: { status: "rejected" } }),
      prisma.team.count({ where: { active: true } }),
      prisma.user.count({ where: { role: "STUDENT", isActive: true, ...userCollegeFilter } }),
      prisma.user.count({ where: { role: "FACULTY", isActive: true, ...userCollegeFilter } }),
      prisma.feedback.count({ where: { isRead: false } }),
      prisma.equipmentRequest.findMany({
        take:    5,
        orderBy: { createdAt: "desc" },
        include: {
          equipment: { select: { name: true, emoji: true } },
          student:   { select: { name: true } },
        },
      }),
      prisma.faultScan.findMany({
        take:    5,
        orderBy: { createdAt: "desc" },
        include: {
          equipment: { select: { name: true, emoji: true } },
          scannedBy: { select: { name: true } },
        },
      }),
    ]);

    // ✅ NEW — Top Requested Equipment: group requests by equipment,
    // count, sort descending, take top 5
    const grouped = await prisma.equipmentRequest.groupBy({
      by: ["equipmentId"],
      _count: { equipmentId: true },
      orderBy: { _count: { equipmentId: "desc" } },
      take: 5,
    });

    const topEquipmentIds = grouped.map((g) => g.equipmentId);
    const topEquipmentDetails = topEquipmentIds.length
      ? await prisma.equipment.findMany({
          where: { id: { in: topEquipmentIds } },
          select: { id: true, name: true, emoji: true, equipmentId: true },
        })
      : [];

    const topRequestedEquipment = grouped.map((g) => {
      const eq = topEquipmentDetails.find((e) => e.id === g.equipmentId);
      return {
        name: eq?.name ?? "Unknown",
        emoji: eq?.emoji ?? "📦",
        equipmentId: eq?.equipmentId ?? null,
        requests: g._count.equipmentId,
      };
    });

    ok(res, {
      equipment: { total: totalEquipment, available: availableEquipment, issued: issuedEquipment, maintenance: maintenanceEquipment },
      requests:  { total: totalRequests, pendingFaculty, pendingLab, approved: approvedRequests, rejected: rejectedRequests },
      teams:     { active: activeTeams },
      users:     { students: totalStudents, faculty: totalFaculty },
      feedback:  { unread: unreadFeedback },
      recent:    { requests: recentRequests, scans: recentScans },
      // ✅ NEW — drives the "Top Requested Equipment" widget
      topRequestedEquipment,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users
export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { role, q, isActive: isActiveParam } = req.query as Record<string, string>;

    const requester = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    const isSuperAdmin = requester?.canManageAdmins ?? false;

    // Default to active users; pass isActive=false to get deactivated
    const activeFilter = isActiveParam === "false" ? false : true;

    const users = await prisma.user.findMany({
      where: {
        isActive: activeFilter,
        ...(role && { role: role.toUpperCase() as any }),
        ...(!isSuperAdmin && { collegeId: req.user!.collegeId }),
        ...(q && {
          OR: [
            { name:         { contains: q, mode: "insensitive" } },
            { enrollmentId: { contains: q, mode: "insensitive" } },
            { email:        { contains: q, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        college: { select: { name: true } },
        teamMemberships: {
          where:   { team: { active: true } },
          include: { team: { select: { teamCode: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    ok(res, users.map(u => ({
      id:           u.id,
      enrollmentId: u.enrollmentId,
      name:         u.name,
      email:        u.email,
      role:         u.role,
      department:   u.department,
      semester:     u.semester,
      college:      u.college.name,
      // ✅ NEW — needed for the Deactivated Students tab
      isActive:     u.isActive,
      updatedAt:    u.updatedAt,
      activeTeam:   u.teamMemberships[0]?.team ?? null,
    })));
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/users  — register new user
export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      enrollmentId: z.string().min(1),
      name:         z.string().min(2),
      email:        z.string().email().optional(),
      password:     z.string().min(6),
      role:         z.enum(["STUDENT", "FACULTY", "ADMIN"]),
      department:   z.string().min(1),
      semester:     z.string().optional(),
      collegeName:  z.string().min(1),
      canManageAdmins: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    // Block non-superadmins from creating ADMIN users
    if (data.role === "ADMIN") {
      const requester = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!requester?.canManageAdmins) {
        forbidden(res, "You do not have permission to create admin users.");
        return;
      }
    }

    const college = await prisma.college.findUnique({ where: { name: data.collegeName } });
    if (!college) { notFound(res, `College "${data.collegeName}" not found.`); return; }

    const existing = await prisma.user.findUnique({ where: { enrollmentId: data.enrollmentId } });
    if (existing) {
      // ✅ Friendlier message when the clash is a deactivated account —
      // points the admin to reactivate instead of being stuck.
      badRequest(res, existing.isActive
        ? "A user with this enrollment ID already exists."
        : `An account with this enrollment ID already exists but is deactivated. Reactivate "${existing.name}" from the Deactivated Students tab instead of creating a new account.`
      );
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        enrollmentId: data.enrollmentId,
        name:         data.name,
        email:        data.email,
        passwordHash,
        role:         data.role,
        department:   data.department,
        semester:     data.semester,
        collegeId:    college.id,
        canManageAdmins: data.role === "ADMIN" ? (data.canManageAdmins ?? false) : false,
      },
    });

    created(res, {
      id:           user.id,
      enrollmentId: user.enrollmentId,
      name:         user.name,
      role:         user.role,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id/deactivate
export async function deactivateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) { notFound(res, "User not found."); return; }

    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    ok(res, { message: `User ${user.name} deactivated.` });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id/reactivate
export async function reactivateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) { notFound(res, "User not found."); return; }

    await prisma.user.update({ where: { id: user.id }, data: { isActive: true } });
    ok(res, { message: `User ${user.name} reactivated.` });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/users/:id  — permanent delete
export async function deleteUserPermanent(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) { notFound(res, "User not found."); return; }

    // Delete related records first — every model with a required FK to User
    // must be cleared before the User row itself can be removed.
    await prisma.teamMember.deleteMany({ where: { userId: user.id } });
    // ✅ FIX — EquipmentRequest has TWO user relations (student + faculty);
    // both must be cleared, or deleting a faculty member with verified
    // requests would fail on the foreign key constraint.
    await prisma.equipmentRequest.deleteMany({ where: { OR: [{ studentId: user.id }, { facultyId: user.id }] } });
    await prisma.faultScan.deleteMany({ where: { scannedById: user.id } });
    await prisma.directMessage.deleteMany({ where: { OR: [{ senderId: user.id }, { receiverId: user.id }] } });
    // ✅ FIX — Feedback's actual FK to User is `submittedById`, not `userId`.
    await prisma.feedback.deleteMany({ where: { submittedById: user.id } });
    // ✅ NEW — RequestMessage.sentById has no cascade of its own; messages
    // this user sent on OTHER people's request threads (e.g. an admin
    // replying on many different students' requests) won't be swept up
    // by the EquipmentRequest deletion above unless this user was also
    // the student/faculty on that specific request — must clear explicitly.
    await prisma.requestMessage.deleteMany({ where: { sentById: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    ok(res, { message: `User ${user.name} permanently deleted.` });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/colleges
export async function listColleges(_req: Request, res: Response, next: NextFunction) {
  try {
    const colleges = await prisma.college.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    });
    ok(res, colleges);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id/reset-password  (admin only)
export async function resetUserPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      badRequest(res, "New password must be at least 6 characters."); return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) { notFound(res, "User not found."); return; }
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    ok(res, { message: `Password reset for ${user.name}.` });
  } catch (err) { next(err); }
}

// PATCH /api/admin/users/:id  — general update (name, email, dept, semester)
export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const allowed = ["name", "email", "department", "semester", "isActive"];
    const data: any = {};
    for (const k of allowed) { if (req.body[k] !== undefined) data[k] = req.body[k]; }
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    ok(res, user);
  } catch (err) { next(err); }
}

// POST /api/admin/colleges — register new college (superadmin only)
export async function createCollege(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      name: z.string().min(2),
    });
    const data = schema.parse(req.body);

    const existing = await prisma.college.findUnique({ where: { name: data.name } });
    if (existing) { badRequest(res, "A college with this name already exists."); return; }

    const college = await prisma.college.create({ data: { name: data.name } });
    created(res, college);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/colleges/:id — update college (superadmin only)
export async function updateCollege(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const schema = z.object({
      name: z.string().min(2).optional(),
      isActive: z.boolean().optional(),
    });
    const data = schema.parse(req.body);

    // Check if college exists
    const existing = await prisma.college.findUnique({ where: { id } });
    if (!existing) { notFound(res, "College not found."); return; }

    // If renaming, check uniqueness
    if (data.name && data.name !== existing.name) {
      const dup = await prisma.college.findUnique({ where: { name: data.name } });
      if (dup) { badRequest(res, "A college with this name already exists."); return; }
    }

    const college = await prisma.college.update({ where: { id }, data });
    ok(res, college);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/colleges/:id — delete college (superadmin only)
export async function deleteCollege(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const existing = await prisma.college.findUnique({ where: { id } });
    if (!existing) { notFound(res, "College not found."); return; }

    // Check if college has users
    const userCount = await prisma.user.count({ where: { collegeId: id } });
    if (userCount > 0) {
      badRequest(res, `Cannot delete: ${userCount} user(s) are still linked to this college. Deactivate or transfer them first.`);
      return;
    }

    await prisma.college.delete({ where: { id } });
    ok(res, { message: `"${existing.name}" deleted successfully.` });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/admin/equipment-report?from=...&to=...&format=xlsx|csv&department=...
// ✅ NEW — "bank statement" style equipment transaction report.
// Every row = one request that was issued and/or returned within the
// selected date range, including its return condition. Downloadable
// as Excel or CSV so a lab assistant can audit, sort, or archive it.
// ─────────────────────────────────────────────────────────────
const CONDITION_LABELS: Record<number, string> = {
  5: "Excellent",
  4: "Good",
  3: "Fair (inspection hold)",
  2: "Damaged",
  1: "Faulty",
};

export async function getEquipmentTransactionReport(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { from, to, format, department } = req.query as Record<string, string>;

    if (!from || !to) {
      badRequest(res, "Both 'from' and 'to' dates are required.");
      return;
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    // Include the entire "to" day, not just midnight
    toDate.setHours(23, 59, 59, 999);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      badRequest(res, "Invalid date format. Use YYYY-MM-DD.");
      return;
    }
    if (fromDate > toDate) {
      badRequest(res, "'from' date must be before 'to' date.");
      return;
    }

    // A "transaction" = a request that was either issued or returned
    // within the window — this matches what an issued/returned ledger
    // (like a bank statement of activity) should show.
    const requests = await prisma.equipmentRequest.findMany({
      where: {
        OR: [
          { issuedAt:   { gte: fromDate, lte: toDate } },
          { returnedAt: { gte: fromDate, lte: toDate } },
        ],
        ...(department && { equipment: { department } }),
      },
      include: {
        equipment: { select: { name: true, equipmentId: true, category: true, department: true, labLocation: true } },
        student:   { select: { name: true, enrollmentId: true, department: true } },
        faculty:   { select: { name: true } },
      },
      orderBy: [{ issuedAt: "asc" }],
    });

    if (!requests.length) {
      badRequest(res, "No equipment transactions found in that date range.");
      return;
    }

    const rows = requests.map((r) => ({
      "Request Code":     r.requestCode,
      "Equipment ID":     r.equipment.equipmentId ?? "—",
      "Equipment Name":   r.equipment.name,
      "Category":         r.equipment.category,
      "Department":       r.equipment.department ?? "General",
      "Lab Location":     r.equipment.labLocation,
      "Student":          r.student.name,
      "Enrollment ID":    r.student.enrollmentId,
      "Faculty Verified": r.faculty.name,
      "Issued On":        r.issuedAt ? r.issuedAt.toISOString().slice(0, 10) : "—",
      "Due Back":         r.dateTo.toISOString().slice(0, 10),
      "Returned On":      r.returnedAt ? r.returnedAt.toISOString().slice(0, 10) : "Not yet returned",
      "Status":           r.status,
      "Return Condition": r.conditionRating ? CONDITION_LABELS[r.conditionRating] ?? String(r.conditionRating) : "—",
      "Damage %":         r.damagePercent ?? 0,
      "Damage Notes":     r.damageNotes || "—",
    }));

    const fmt = (format ?? "xlsx").toLowerCase();
    const filenameRange = `${from}_to_${to}`;

    if (fmt === "csv") {
      const sheet = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(sheet);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="equipra-transactions-${filenameRange}.csv"`);
      res.send(csv);
      return;
    }

    // Default: .xlsx
    const sheet = XLSX.utils.json_to_sheet(rows);
    // Reasonable column widths so it's readable without manual resizing
    sheet["!cols"] = Object.keys(rows[0]).map((key) => ({
      wch: Math.min(Math.max(key.length, 12), 28),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Transactions");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="equipra-transactions-${filenameRange}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/admin/users/bulk-upload-template
// Generates a downloadable .xlsx template for bulk student/faculty upload
// ─────────────────────────────────────────────────────────────
export async function downloadUserTemplate(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const headers = [
      "enrollmentId",
      "name",
      "email",
      "password",
      "role",
      "department",
      "semester",
    ];

    const exampleRows = [
      {
        enrollmentId: "PU-STU-100",
        name: "John Doe",
        email: "john.doe@parul.edu",
        password: "pass1234",
        role: "STUDENT",
        department: "Computer Science",
        semester: "5th",
      },
      {
        enrollmentId: "PU-STU-101",
        name: "Jane Smith",
        email: "jane.smith@parul.edu",
        password: "pass1234",
        role: "STUDENT",
        department: "Electronics",
        semester: "3rd",
      },
      {
        enrollmentId: "PU-FAC-050",
        name: "Dr. Patel",
        email: "patel@parul.edu",
        password: "faculty123",
        role: "FACULTY",
        department: "Computer Science",
        semester: "",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(exampleRows, { header: headers });
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="equipra-users-template.xlsx"');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/admin/users/bulk-upload
// Bulk-create students/faculty from an uploaded Excel/CSV file.
// Required columns: enrollmentId, name, password, role, department
// Optional: email, semester
// ─────────────────────────────────────────────────────────────
export async function bulkUploadUsers(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.file) {
      badRequest(res, "No file uploaded.");
      return;
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    if (!rows.length) {
      badRequest(res, "Excel file is empty or has no valid rows.");
      return;
    }

    // Get the admin's college
    const requester = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { college: true },
    });
    if (!requester?.college) {
      badRequest(res, "Your account is not linked to a college.");
      return;
    }
    const collegeId = requester.college.id;
    const collegeName = requester.college.name;
    const isSuperAdmin = requester.canManageAdmins;

    const results = {
      added: [] as any[],
      skipped: [] as { row: number; name?: string; reason: string }[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 = 1-indexed + header row

      const enrollmentId = String(row.enrollmentId ?? "").trim();
      const name = String(row.name ?? "").trim();
      const password = String(row.password ?? "").trim();
      const role = String(row.role ?? "").trim().toUpperCase();
      const department = String(row.department ?? "").trim();
      const email = String(row.email ?? "").trim() || undefined;
      const semester = String(row.semester ?? "").trim() || undefined;

      // Validate required fields
      if (!enrollmentId || !name || !password || !department) {
        results.skipped.push({
          row: rowNum,
          name: name || undefined,
          reason: "Missing required field (enrollmentId, name, password, or department).",
        });
        continue;
      }

      // Validate role
      if (!["STUDENT", "FACULTY"].includes(role)) {
        results.skipped.push({
          row: rowNum,
          name,
          reason: `Invalid role "${role}". Must be STUDENT or FACULTY.`,
        });
        continue;
      }

      // Block non-superadmin from creating ADMIN via bulk
      if (role === "ADMIN" && !isSuperAdmin) {
        results.skipped.push({
          row: rowNum,
          name,
          reason: "Only super-admins can create admin users.",
        });
        continue;
      }

      // Validate password length
      if (password.length < 6) {
        results.skipped.push({
          row: rowNum,
          name,
          reason: "Password must be at least 6 characters.",
        });
        continue;
      }

      // Check for duplicate enrollmentId
      const existing = await prisma.user.findUnique({ where: { enrollmentId } });
      if (existing) {
        results.skipped.push({
          row: rowNum,
          name,
          reason: existing.isActive
            ? `Enrollment ID "${enrollmentId}" already exists.`
            : `Enrollment ID "${enrollmentId}" belongs to a deactivated account ("${existing.name}"). Reactivate it from the Deactivated Students tab instead.`,
        });
        continue;
      }

      // Check email uniqueness if provided
      if (email) {
        const emailExists = await prisma.user.findUnique({ where: { email } });
        if (emailExists) {
          results.skipped.push({
            row: rowNum,
            name,
            reason: `Email "${email}" already in use.`,
          });
          continue;
        }
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          enrollmentId,
          name,
          email: email || null,
          passwordHash,
          role: role as any,
          department,
          semester,
          collegeId,
        },
      });

      results.added.push({
        name: user.name,
        enrollmentId: user.enrollmentId,
        role: user.role,
      });
    }

    ok(res, {
      message: `${results.added.length} of ${rows.length} user(s) added to ${collegeName}.`,
      ...results,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// SEMESTER FOLDERS — editable display labels for the folder
// groupings shown in the admin Students tab (e.g. rename "1st" to
// "First Year - Batch A"). Scoped to the requester's own college.
// ─────────────────────────────────────────────────────────────

// GET /api/admin/semester-folders
export async function listSemesterFolders(req: Request, res: Response, next: NextFunction) {
  try {
    const requester = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!requester) { notFound(res, "User not found."); return; }

    const folders = await prisma.semesterFolder.findMany({
      where: { collegeId: requester.collegeId },
    });

    ok(res, folders);
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/semester-folders/:key
export async function upsertSemesterFolder(req: Request, res: Response, next: NextFunction) {
  try {
    const { key } = req.params;
    const schema = z.object({ label: z.string().min(1).max(60) });
    const data = schema.parse(req.body);

    const requester = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!requester) { notFound(res, "User not found."); return; }

    const folder = await prisma.semesterFolder.upsert({
      where: { collegeId_key: { collegeId: requester.collegeId, key } },
      update: { label: data.label },
      create: { collegeId: requester.collegeId, key, label: data.label },
    });

    ok(res, folder);
  } catch (err) {
    next(err);
  }
}
