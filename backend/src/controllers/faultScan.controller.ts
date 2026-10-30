// src/controllers/faultScan.controller.ts
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok, created, notFound, badRequest } from "../lib/response";
import { z } from "zod";

// GET /api/fault-scans?equipmentSlug=esp32-wifi
export async function listScans(req: Request, res: Response, next: NextFunction) {
  try {
    const { equipmentSlug } = req.query as Record<string, string>;
    const where: any = {};

    if (equipmentSlug) {
      const eq = await prisma.equipment.findUnique({ where: { slug: equipmentSlug } });
      if (!eq) { notFound(res, "Equipment not found."); return; }
      where.equipmentId = eq.id;
    }

    const scans = await prisma.faultScan.findMany({
      where,
      include: {
        equipment: { select: { slug: true, name: true, emoji: true } },
        scannedBy: { select: { name: true, enrollmentId: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take:    50,
    });

    ok(res, scans);
  } catch (err) {
    next(err);
  }
}

// POST /api/fault-scans  (admin only)
export async function createScan(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      equipmentSlug: z.string().min(1),
      result:        z.enum(["ok", "fault"]),
      notes:         z.string().default(""),
    });
    const { equipmentSlug, result, notes } = schema.parse(req.body);

    const equipment = await prisma.equipment.findUnique({ where: { slug: equipmentSlug } });
    if (!equipment) { notFound(res, "Equipment not found."); return; }

    // Create the scan record
    const scan = await prisma.faultScan.create({
      data: {
        equipmentId: equipment.id,
        scannedById: req.user!.userId,
        result,
        notes,
      },
      include: {
        equipment: { select: { slug: true, name: true } },
        scannedBy: { select: { name: true, role: true } },
      },
    });

    // Update equipment fault scan status
    const newFaultStatus =
      result === "fault" ? "fault_detected" : "scanned_ok_after";

    await prisma.equipment.update({
      where: { id: equipment.id },
      data: {
        faultScanStatus:    newFaultStatus as any,
        availabilityStatus: result === "fault" ? "maintenance" : equipment.availabilityStatus,
      },
    });

    // Add a timeline entry
    await prisma.equipmentTimeline.create({
      data: {
        equipmentId: equipment.id,
        description: result === "ok"
          ? `Fault scan completed — No issues detected`
          : `⚠️ Fault detected: ${notes || "No details provided"}`,
        status: result === "ok" ? "success" : "error",
      },
    });

    created(res, scan);
  } catch (err) {
    next(err);
  }
}
