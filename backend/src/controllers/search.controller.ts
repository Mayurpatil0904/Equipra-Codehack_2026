import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok } from "../lib/response";

export async function globalSearch(req: Request, res: Response, next: NextFunction) {
  try {
    const q = (req.query.q as string || "").trim();
    if (!q || q.length < 2) { ok(res, { equipment: [], users: [], projects: [], teams: [] }); return; }

    const [equipment, users, projects, teams] = await Promise.all([
      prisma.equipment.findMany({
        where: { isActive: true, OR: [
          { name: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          { equipmentId: { contains: q, mode: "insensitive" } },
        ]},
        select: { id: true, slug: true, name: true, category: true, equipmentId: true, availabilityStatus: true },
        take: 5,
      }),
      prisma.user.findMany({
        where: { isActive: true, OR: [
          { name: { contains: q, mode: "insensitive" } },
          { enrollmentId: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ]},
        select: { id: true, name: true, enrollmentId: true, role: true, department: true },
        take: 5,
      }),
      prisma.project.findMany({
        where: { OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ]},
        select: { id: true, name: true, projectType: true, status: true },
        take: 5,
      }),
      prisma.team.findMany({
        where: { OR: [
          { name: { contains: q, mode: "insensitive" } },
          { teamId: { contains: q, mode: "insensitive" } },
        ]},
        select: { id: true, name: true, teamId: true },
        take: 5,
      }),
    ]);

    ok(res, { equipment, users, projects, teams });
  } catch (err) { next(err); }
}
