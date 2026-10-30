// src/controllers/auth.controller.ts
import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { ok, badRequest, unauthorized, AppError } from "../lib/response";
import { checkReturnReminders } from "../lib/returnReminders";
import { z } from "zod";

const loginSchema = z.object({
  enrollmentId: z.string().min(1, "Enrollment ID required"),
  password:     z.string().min(1, "Password required"),
  collegeName:  z.string().min(1, "College name required"),
  role:         z.enum(["STUDENT", "FACULTY", "ADMIN"]),
});

// POST /api/auth/login
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    console.log("BODY:", req.body);

    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      console.log("VALIDATION ERROR:", parsed.error.errors);

      badRequest(res, parsed.error.errors[0].message);
      return;
    }

    const {
      enrollmentId,
      password,
      collegeName,
      role,
    } = parsed.data;

    console.log("SEARCHING USER WITH:", {
      enrollmentId,
      collegeName,
      role,
    });

    const user = await prisma.user.findFirst({
      where: {
        enrollmentId,
        role,
        isActive: true,
        college: {
          name: collegeName,
        },
      },

      include: {
        college: true,
      },
    });

    console.log("FOUND USER:", user);

    if (!user) {
      unauthorized(
        res,
        "Invalid credentials. Check your ID, password, college, and role."
      );
      return;
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.passwordHash
    );

    console.log("PASSWORD MATCH:", passwordMatch);

    if (!passwordMatch) {
      unauthorized(res, "Invalid credentials.");
      return;
    }

    const token = signToken({
      userId: user.id,
      enrollmentId: user.enrollmentId,
      role: user.role,
      collegeId: user.collegeId,
      canManageAdmins: user.canManageAdmins,
    });

    ok(res, {
      token,

      user: {
        id: user.id,
        enrollmentId: user.enrollmentId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        semester: user.semester,
        college: user.college.name,
        canManageAdmins: user.canManageAdmins,
      },
    });

    // Fire-and-forget: check for equipment return reminders
    checkReturnReminders().catch(() => {});
  } catch (err) {

    console.error(err);

    next(err);
  }
}
// GET /api/auth/me  (requires token)
export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where:   { id: req.user!.userId },
      include: { college: true },
    });
    if (!user) { unauthorized(res, "User not found."); return; }

    ok(res, {
      id:           user.id,
      enrollmentId: user.enrollmentId,
      name:         user.name,
      email:        user.email,
      role:         user.role,
      department:   user.department,
      semester:     user.semester,
      college:      user.college.name,
      canManageAdmins: user.canManageAdmins,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/auth/change-password
export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      badRequest(res, "Both currentPassword and newPassword are required."); return;
    }
    if (newPassword.length < 6) {
      badRequest(res, "New password must be at least 6 characters."); return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) { unauthorized(res); return; }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) { badRequest(res, "Current password is incorrect."); return; }

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });

    ok(res, { message: "Password changed successfully." });
  } catch (err) {
    next(err);
  }
}
