// src/controllers/ai.controller.ts
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok, badRequest } from "../lib/response";
import {
  discoverCompetitions,
  generateLabInsights,
  isConfigured,
} from "../lib/groq";

// POST /api/ai/discover-competitions — admin only
export async function aiDiscoverCompetitions(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log("[AI] Discovering competitions...");
    const competitions = await discoverCompetitions();
    console.log(`[AI] Found ${competitions.length} competitions`);

    let added = 0;
    for (const c of competitions) {
      // Skip if a competition with the same name already exists
      const existing = await prisma.competition.findFirst({
        where: { name: c.name },
      });
      if (existing) continue;

      await prisma.competition.create({
        data: {
          name: c.name,
          organizer: c.organizer || null,
          deadline: c.deadline ? new Date(c.deadline) : null,
          description: c.description || null,
          website: c.website || null,
          regLink: c.regLink || c.website || null,
          source: "ai",
          category: c.category || "competition",
          eligibility: c.eligibility || "all",
          prize: c.prize || null,
          location: c.location || "Online",
        },
      });
      added++;
    }

    console.log(`[AI] ✅ Added ${added} new competitions`);
    ok(res, {
      message: `Discovered ${competitions.length} competitions, added ${added} new ones.`,
      total: competitions.length,
      added,
    });
  } catch (err: any) {
    console.error("[AI] ❌ Competition discovery failed:", err.message);
    next(err);
  }
}

// GET /api/ai/lab-insights — admin only
export async function aiLabInsights(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {

    // Gather lab data for analysis
    const [
      totalEquipment,
      availableEquipment,
      maintenanceEquipment,
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      totalStudents,
      totalFaculty,
      recentFaults,
      topEquipment,
    ] = await Promise.all([
      prisma.equipment.count({ where: { isActive: true } }),
      prisma.equipment.count({ where: { isActive: true, availabilityStatus: "available" } }),
      prisma.equipment.count({ where: { isActive: true, availabilityStatus: "maintenance" } }),
      prisma.equipmentRequest.count(),
      prisma.equipmentRequest.count({ where: { status: { in: ["pending_faculty", "pending_lab"] as any } } }),
      prisma.equipmentRequest.count({ where: { status: "approved" as any } }),
      prisma.equipmentRequest.count({ where: { status: "rejected" as any } }),
      prisma.user.count({ where: { role: "STUDENT", isActive: true } }),
      prisma.user.count({ where: { role: "FACULTY", isActive: true } }),
      prisma.faultScan.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { equipment: { select: { name: true } } },
      }),
      prisma.equipmentRequest.groupBy({
        by: ["equipmentId"],
        _count: { equipmentId: true },
        orderBy: { _count: { equipmentId: "desc" } },
        take: 5,
      }),
    ]);

    // Get equipment names for top requested
    const topIds = topEquipment.map((t) => t.equipmentId);
    const topNames = await prisma.equipment.findMany({
      where: { id: { in: topIds } },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(topNames.map((e) => [e.id, e.name]));

    const labData = {
      equipment: {
        total: totalEquipment,
        available: availableEquipment,
        maintenance: maintenanceEquipment,
        utilizationRate: totalEquipment > 0
          ? Math.round(((totalEquipment - availableEquipment) / totalEquipment) * 100)
          : 0,
      },
      requests: {
        total: totalRequests,
        pending: pendingRequests,
        approved: approvedRequests,
        rejected: rejectedRequests,
        approvalRate: totalRequests > 0
          ? Math.round((approvedRequests / totalRequests) * 100)
          : 0,
      },
      users: { students: totalStudents, faculty: totalFaculty },
      recentFaultScans: recentFaults.map((f) => ({
        equipment: f.equipment.name,
        result: f.result,
        date: f.createdAt,
      })),
      topRequestedEquipment: topEquipment.map((t) => ({
        name: nameMap[t.equipmentId] || "Unknown",
        requestCount: t._count.equipmentId,
      })),
    };

    console.log("[AI] Generating lab insights...");
    const rawInsights = await generateLabInsights(labData);

    // Parse insights
    let insights;
    try {
      let jsonStr = rawInsights;
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      insights = JSON.parse(jsonStr);
    } catch {
      insights = [
        {
          type: "info",
          title: "Analysis Complete",
          description: rawInsights,
          severity: "info",
        },
      ];
    }

    ok(res, { insights, labData });
  } catch (err: any) {
    console.error("[AI] ❌ Lab insights failed:", err.message);
    next(err);
  }
}
