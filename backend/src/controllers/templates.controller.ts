// src/controllers/templates.controller.ts
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok, created, notFound, badRequest } from "../lib/response";
import { nextProjectCode } from "../lib/requestCode";
import { z } from "zod";

// GET /api/templates — list all public templates (+ own private ones)
export async function listTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const templates = await prisma.projectTemplate.findMany({
      where: {
        OR: [
          { isPublic: true },
          { createdById: req.user!.userId },
        ],
      },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    ok(res, templates);
  } catch (err) { next(err); }
}

// GET /api/templates/:id
export async function getTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const tpl = await prisma.projectTemplate.findUnique({
      where: { id: req.params.id },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!tpl) { notFound(res, "Template not found."); return; }
    ok(res, tpl);
  } catch (err) { next(err); }
}

// POST /api/templates — create a template (admin/faculty)
export async function createTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      name:             z.string().min(1),
      description:      z.string().min(1),
      department:       z.string().optional(),
      projectType:      z.enum(["HARDWARE", "SOFTWARE", "HYBRID"]).default("HYBRID"),
      technologyStack:  z.array(z.string()).default([]),
      telemetryPresets: z.array(z.object({
        fieldName:    z.string(),
        label:        z.string(),
        unit:         z.string().optional(),
        dataType:     z.enum(["NUMBER", "BOOLEAN", "STRING"]).default("NUMBER"),
        widgetType:   z.enum(["GAUGE", "CHART", "STATUS_CARD", "LED", "VALUE"]).default("VALUE"),
        thresholdMin: z.number().optional(),
        thresholdMax: z.number().optional(),
      })).default([]),
      isPublic: z.boolean().default(true),
    });
    const data = schema.parse(req.body);

    const tpl = await prisma.projectTemplate.create({
      data: {
        name:            data.name,
        description:     data.description,
        department:      data.department,
        projectType:     data.projectType,
        technologyStack: data.technologyStack,
        telemetryPresets: data.telemetryPresets as any,
        isPublic:        data.isPublic,
        createdBy:       { connect: { id: req.user!.userId } },
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    created(res, tpl);
  } catch (err) { next(err); }
}

// DELETE /api/templates/:id
export async function deleteTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const tpl = await prisma.projectTemplate.findUnique({ where: { id: req.params.id } });
    if (!tpl) { notFound(res, "Template not found."); return; }
    // Only creator or admin can delete
    if (tpl.createdById !== req.user!.userId && req.user!.role !== "ADMIN") {
      badRequest(res, "You can only delete your own templates.");
      return;
    }
    await prisma.projectTemplate.delete({ where: { id: req.params.id } });
    ok(res, { message: "Template deleted." });
  } catch (err) { next(err); }
}

// POST /api/templates/:id/apply — create a project from this template
export async function applyTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      name:        z.string().min(1),
      description: z.string().min(1),
      guideId:     z.string().uuid(),
    });
    const data = schema.parse(req.body);

    const tpl = await prisma.projectTemplate.findUnique({ where: { id: req.params.id } });
    if (!tpl) { notFound(res, "Template not found."); return; }

    const projectCode = await nextProjectCode();

    // Create the project
    const project = await prisma.project.create({
      data: {
        projectCode,
        name:            data.name,
        description:     data.description,
        department:      tpl.department ?? req.user!.role === "STUDENT" ? "General" : "General",
        technologyStack: tpl.technologyStack,
        projectType:     tpl.projectType,
        collegeId:       req.user!.collegeId,
        guideId:         data.guideId,
        createdById:     req.user!.userId,
      },
    });

    // Auto-add the creator as a member
    await prisma.projectMember.create({
      data: { projectId: project.id, userId: req.user!.userId, role: "Lead" },
    });

    // Apply telemetry presets
    const presets = (tpl.telemetryPresets as any[]) ?? [];
    if (presets.length > 0) {
      await prisma.telemetryDefinition.createMany({
        data: presets.map((p: any, i: number) => ({
          projectId:    project.id,
          fieldName:    p.fieldName,
          label:        p.label,
          unit:         p.unit ?? null,
          dataType:     p.dataType ?? "NUMBER",
          widgetType:   p.widgetType ?? "VALUE",
          thresholdMin: p.thresholdMin ?? null,
          thresholdMax: p.thresholdMax ?? null,
          sortOrder:    i,
        })),
      });
    }

    // Timeline entry
    await prisma.projectTimeline.create({
      data: {
        projectId: project.id,
        event: "Project created from template",
        description: `Created from template: ${tpl.name}`,
      },
    });

    const full = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        createdBy: { select: { id: true, name: true } },
        guide:     { select: { id: true, name: true } },
        members:   { include: { user: { select: { id: true, name: true } } } },
        telemetryDefs: { orderBy: { sortOrder: "asc" } },
        _count: { select: { devices: true, members: true } },
      },
    });

    created(res, full);
  } catch (err) { next(err); }
}
