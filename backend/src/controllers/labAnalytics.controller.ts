// src/controllers/labAnalytics.controller.ts
//
// Phase 10 — Smart Lab Analytics
// Cross-project statistics, department reports, equipment utilization,
// and IoT platform-wide metrics for admin dashboards.

import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok } from "../lib/response";

// GET /api/lab-analytics/overview — platform-wide stats
export async function getOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const { collegeId } = req.user!;

    const [
      totalProjects,
      activeProjects,
      completedProjects,
      totalDevices,
      onlineDevices,
      totalMembers,
      totalTelemetryRows,
      totalCompetitions,
      totalEntries,
      recentProjects,
    ] = await Promise.all([
      prisma.project.count({ where: { collegeId } }),
      prisma.project.count({ where: { collegeId, status: "ACTIVE" } }),
      prisma.project.count({ where: { collegeId, status: "COMPLETED" } }),
      prisma.device.count({ where: { project: { collegeId } } }),
      prisma.device.count({
        where: {
          project: { collegeId },
          status: "ONLINE",
          lastSeenAt: { gt: new Date(Date.now() - 30_000) },
        },
      }),
      prisma.projectMember.count({ where: { project: { collegeId } } }),
      prisma.telemetryData.count({
        where: { device: { project: { collegeId } } },
      }),
      prisma.competition.count(),
      prisma.competitionEntry.count({
        where: { project: { collegeId } },
      }),
      prisma.project.findMany({
        where: { collegeId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true, projectCode: true, name: true, status: true,
          projectType: true, department: true, createdAt: true,
          _count: { select: { devices: true, members: true } },
        },
      }),
    ]);

    ok(res, {
      projects: { total: totalProjects, active: activeProjects, completed: completedProjects },
      devices:  { total: totalDevices, online: onlineDevices },
      members:  totalMembers,
      telemetryRows: totalTelemetryRows,
      competitions: { total: totalCompetitions, entries: totalEntries },
      recentProjects,
    });
  } catch (err) { next(err); }
}

// GET /api/lab-analytics/by-department — projects grouped by department
export async function getByDepartment(req: Request, res: Response, next: NextFunction) {
  try {
    const { collegeId } = req.user!;

    const projects = await prisma.project.findMany({
      where: { collegeId },
      select: {
        department: true,
        status: true,
        projectType: true,
        _count: { select: { devices: true, members: true } },
      },
    });

    // Group by department
    const deptMap = new Map<string, {
      department: string;
      total: number;
      active: number;
      completed: number;
      hardware: number;
      software: number;
      hybrid: number;
      totalDevices: number;
      totalMembers: number;
    }>();

    for (const p of projects) {
      const dept = p.department || "Unassigned";
      if (!deptMap.has(dept)) {
        deptMap.set(dept, {
          department: dept, total: 0, active: 0, completed: 0,
          hardware: 0, software: 0, hybrid: 0, totalDevices: 0, totalMembers: 0,
        });
      }
      const d = deptMap.get(dept)!;
      d.total++;
      if (p.status === "ACTIVE") d.active++;
      if (p.status === "COMPLETED") d.completed++;
      if (p.projectType === "HARDWARE") d.hardware++;
      if (p.projectType === "SOFTWARE") d.software++;
      if (p.projectType === "HYBRID") d.hybrid++;
      d.totalDevices += p._count.devices;
      d.totalMembers += p._count.members;
    }

    ok(res, Array.from(deptMap.values()).sort((a, b) => b.total - a.total));
  } catch (err) { next(err); }
}

// GET /api/lab-analytics/by-type — project type distribution
export async function getByType(req: Request, res: Response, next: NextFunction) {
  try {
    const { collegeId } = req.user!;

    const [hardware, software, hybrid] = await Promise.all([
      prisma.project.count({ where: { collegeId, projectType: "HARDWARE" } }),
      prisma.project.count({ where: { collegeId, projectType: "SOFTWARE" } }),
      prisma.project.count({ where: { collegeId, projectType: "HYBRID" } }),
    ]);

    ok(res, { hardware, software, hybrid, total: hardware + software + hybrid });
  } catch (err) { next(err); }
}

// GET /api/lab-analytics/device-health — all devices with health info
export async function getDeviceHealth(req: Request, res: Response, next: NextFunction) {
  try {
    const { collegeId } = req.user!;

    const devices = await prisma.device.findMany({
      where: { project: { collegeId } },
      select: {
        id: true, deviceCode: true, name: true, type: true,
        status: true, lastSeenAt: true, wifiSignal: true, batteryLevel: true,
        project: { select: { id: true, name: true, projectCode: true, department: true } },
        owner: { select: { id: true, name: true } },
        _count: { select: { telemetryData: true } },
      },
      orderBy: { lastSeenAt: { sort: "desc", nulls: "last" } },
    });

    // Recalculate online status
    const now = Date.now();
    const result = devices.map(d => ({
      ...d,
      isOnline: d.lastSeenAt ? (now - new Date(d.lastSeenAt).getTime()) < 30_000 : false,
    }));

    ok(res, result);
  } catch (err) { next(err); }
}

// GET /api/lab-analytics/equipment-utilization — equipment linked to projects
export async function getEquipmentUtilization(req: Request, res: Response, next: NextFunction) {
  try {
    const { collegeId } = req.user!;

    // Equipment linked to projects
    const links = await prisma.projectEquipment.findMany({
      where: { project: { collegeId } },
      include: {
        equipment: { select: { id: true, name: true, emoji: true, category: true } },
        project:   { select: { id: true, name: true, projectCode: true } },
      },
      orderBy: { linkedAt: "desc" },
    });

    // Total equipment count
    const totalEquipment = await prisma.equipment.count({ where: { isActive: true } });
    const linkedEquipmentIds = new Set(links.map(l => l.equipmentId));

    ok(res, {
      totalEquipment,
      linkedToProjects: linkedEquipmentIds.size,
      utilizationPercent: totalEquipment > 0
        ? Math.round((linkedEquipmentIds.size / totalEquipment) * 100)
        : 0,
      links,
    });
  } catch (err) { next(err); }
}

// GET /api/lab-analytics/timeline — recent activity across all projects
export async function getActivityTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    const { collegeId } = req.user!;
    const limit = Math.min(Number(req.query.limit ?? 30), 100);

    const events = await prisma.projectTimeline.findMany({
      where: { project: { collegeId } },
      include: {
        project: { select: { id: true, name: true, projectCode: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    ok(res, events);
  } catch (err) { next(err); }
}
