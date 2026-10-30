// backend/src/controllers/contacts.controller.ts
// NEW FILE — returns who the current user can message
// Students  → ADMIN + FACULTY in same college
// Faculty   → ADMIN + STUDENT in same college
// Admin     → FACULTY + STUDENT in same college

import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok } from "../lib/response";

export async function listContacts(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, role, collegeId } = req.user!;

    const roleFilter: Record<string, string[]> = {
      STUDENT: ["ADMIN", "FACULTY"],
      FACULTY: ["ADMIN", "STUDENT"],
      ADMIN:   ["FACULTY", "STUDENT"],
    };

    const allowedRoles = roleFilter[role] ?? ["ADMIN", "FACULTY"];

    const contacts = await prisma.user.findMany({
      where: {
        id:       { not: userId },
        role:     { in: allowedRoles as any },
        isActive: true,
        collegeId,
      },
      select: {
        id:           true,
        name:         true,
        role:         true,
        department:   true,
        enrollmentId: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    ok(res, contacts);
  } catch (err) {
    next(err);
  }
}
