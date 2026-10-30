// src/controllers/teams.controller.ts
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok, created, notFound, badRequest, forbidden, AppError } from "../lib/response";
import { createNotification } from "../lib/notify";
import { emailTeamCreated } from "../lib/email";
import * as XLSX from "xlsx";
import fs from "fs";
import { z } from "zod";

function generateTeamCode(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `TEAM-PU-${n}`;
}

// ── GET /api/teams  ───────────────────────────────────────────
export async function listTeams(req: Request, res: Response, next: NextFunction) {
  try {
    const { role, userId } = req.user!;
    const where: any = {};

    if (role === "FACULTY") where.professorId = userId;
    if (role === "STUDENT") {
      // Only teams the student belongs to
      where.members = { some: { userId } };
    }

    const teams = await prisma.team.findMany({
      where,
      include: {
        professor: { select: { id: true, name: true, enrollmentId: true } },
        members: {
          include: { user: { select: { id: true, name: true, enrollmentId: true, department: true } } },
        },
        requests: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    ok(res, teams);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/teams/:code  ─────────────────────────────────────
export async function getTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const team = await prisma.team.findUnique({
      where: { teamCode: req.params.code },
      include: {
        professor: { select: { id: true, name: true, enrollmentId: true } },
        members: {
          include: { user: { select: { id: true, name: true, enrollmentId: true, department: true } } },
        },
      },
    });
    if (!team) { notFound(res, `Team ${req.params.code} not found.`); return; }
    ok(res, team);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/teams  (faculty only) ──────────────────────────
// Creates team without members — members added via /upload-members
export async function createTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      name:    z.string().min(2, "Team name must be at least 2 characters"),
      project: z.string().min(3, "Project name must be at least 3 characters"),
    });
    const { name, project } = schema.parse(req.body);

    const team = await prisma.team.create({
      data: {
        teamCode:    generateTeamCode(),
        name,
        project,
        professorId: req.user!.userId,
        active:      true,
      },
      include: {
        professor: { select: { name: true } },
      },
    });

    created(res, team);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/teams/:code/upload-members  (faculty only) ─────
// Accepts Excel/CSV file with columns: enrollmentId, role (optional)
export async function uploadMembers(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) { badRequest(res, "No file uploaded."); return; }

    const team = await prisma.team.findUnique({ where: { teamCode: req.params.code } });
    if (!team) { notFound(res, "Team not found."); return; }
    if (team.professorId !== req.user!.userId) {
      forbidden(res, "You can only manage your own teams."); return;
    }

    // Parse Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = XLSX.utils.sheet_to_json<{ enrollmentId: string; role?: string }>(sheet);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (!rows.length) { badRequest(res, "Excel file is empty or has no valid rows."); return; }

    const results = { added: [] as any[], notFound: [] as string[], alreadyMember: [] as string[] };

    for (const row of rows) {
      const eId = String(row.enrollmentId ?? "").trim();
      if (!eId) continue;

      const user = await prisma.user.findUnique({ where: { enrollmentId: eId } });
      if (!user) { results.notFound.push(eId); continue; }

      const existing = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: team.id, userId: user.id } },
      });
      if (existing) { results.alreadyMember.push(eId); continue; }

      const member = await prisma.teamMember.create({
        data: { teamId: team.id, userId: user.id, role: row.role === "Leader" ? "Leader" : "Member" },
        include: { user: { select: { name: true, email: true, enrollmentId: true } } },
      });

      results.added.push(member);

      // Notify each new member
      await createNotification({
        userId: user.id,
        title:  `Added to team ${team.teamCode}`,
        body:   `You've been added to "${team.name}" for project: ${team.project}. Your Team ID is ${team.teamCode}.`,
        type:   "team_update",
        link:   "/teams",
      });

      // Email member
      if (user.email) {
        const prof = await prisma.user.findUnique({ where: { id: team.professorId }, select: { name: true } });
        await emailTeamCreated({
          memberEmail:   user.email,
          memberName:    user.name,
          teamCode:      team.teamCode,
          teamName:      team.name,
          project:       team.project,
          professorName: prof?.name ?? "Your Professor",
        });
      }
    }

    ok(res, {
      message:       `${results.added.length} members added.`,
      added:         results.added,
      notFound:      results.notFound,
      alreadyMember: results.alreadyMember,
    });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/teams/:code/deactivate  (faculty only) ────────
export async function deactivateTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const team = await prisma.team.findUnique({ where: { teamCode: req.params.code } });
    if (!team) { notFound(res, "Team not found."); return; }
    if (team.professorId !== req.user!.userId) {
      forbidden(res, "You can only manage your own teams."); return;
    }

    const updated = await prisma.team.update({
      where: { teamCode: req.params.code },
      data:  { active: false },
    });

    // Unlock individual IDs — notify all members
    const members = await prisma.teamMember.findMany({
      where:   { teamId: team.id },
      include: { user: { select: { id: true, name: true } } },
    });
    for (const m of members) {
      await createNotification({
        userId: m.user.id,
        title:  `Team ${team.teamCode} project completed`,
        body:   `The project "${team.project}" has been marked complete. Your individual ID is now unlocked.`,
        type:   "team_update",
        link:   "/teams",
      });
    }

    ok(res, { message: "Team deactivated. Individual IDs unlocked.", team: updated });
  } catch (err) {
    next(err);
  }
}
