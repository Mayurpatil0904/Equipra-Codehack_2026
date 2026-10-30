// src/controllers/projects.controller.ts
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok, created, notFound, badRequest } from "../lib/response";
import { nextProjectCode } from "../lib/requestCode";
import { z } from "zod";
import crypto from "crypto";

// ─── helpers ──────────────────────────────────────────────────
function projectInclude(full = false) {
  return {
    createdBy: { select: { id: true, name: true, enrollmentId: true, department: true } },
    guide:     { select: { id: true, name: true, enrollmentId: true } },
    members: {
      include: { user: { select: { id: true, name: true, enrollmentId: true, department: true } } },
      orderBy: { joinedAt: "asc" as const },
    },
    devices: {
      select: {
        id: true, deviceCode: true, name: true, type: true,
        status: true, lastSeenAt: true, wifiSignal: true, batteryLevel: true,
        // Safe to show — just a short prefix, never the full key
        apiKeyPrefix: true,
      },
      orderBy: { createdAt: "asc" as const },
    },
    telemetryDefs: { orderBy: { sortOrder: "asc" as const } },
    timeline: { orderBy: { createdAt: "desc" as const }, take: full ? 50 : 5 },
    documents: { orderBy: { createdAt: "desc" as const } },
    equipmentLinks: {
      include: { equipment: { select: { id: true, name: true, emoji: true, slug: true, category: true } } },
      orderBy: { linkedAt: "desc" as const },
    },
    _count: { select: { devices: true, members: true } },
  };
}

// GET /api/projects
// STUDENT → their own projects (created or member)
// FACULTY → projects they guide
// ADMIN   → all projects in their college
export async function listProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const { role, userId, collegeId } = req.user!;

    let where: any = { collegeId };

    if (role === "STUDENT") {
      where = {
        collegeId,
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
        ],
      };
    } else if (role === "FACULTY") {
      where = { collegeId, guideId: userId };
    }

    const projects = await prisma.project.findMany({
      where,
      include: projectInclude(),
      orderBy: { createdAt: "desc" },
    });

    ok(res, projects);
  } catch (err) { next(err); }
}

// GET /api/projects/:id
export async function getProject(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: projectInclude(true),
    });
    if (!project) { notFound(res, "Project not found."); return; }
    ok(res, project);
  } catch (err) { next(err); }
}

// GET /api/projects/lookup-user/:enrollmentId — find a student/faculty to add as a member
export async function lookupUserByEnrollment(req: Request, res: Response, next: NextFunction) {
  try {
    const { enrollmentId } = req.params;
    const requester = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!requester) { notFound(res, "User not found."); return; }

    const user = await prisma.user.findFirst({
      where: {
        enrollmentId: enrollmentId.trim(),
        // Scope to the same college — prevents adding members across institutions
        collegeId: requester.collegeId,
        isActive: true,
      },
      select: { id: true, name: true, enrollmentId: true, department: true, role: true },
    });

    if (!user) { notFound(res, "No active user found with that enrollment ID."); return; }
    ok(res, user);
  } catch (err) { next(err); }
}

// POST /api/projects
export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      name:            z.string().min(1),
      // ✅ description and department optional at creation — can be filled later
      description:     z.string().default(""),
      department:      z.string().default(""),
      technologyStack: z.array(z.string()).default([]),
      projectType:     z.enum(["HARDWARE", "SOFTWARE", "HYBRID"]).default("HYBRID"),
      semester:        z.string().optional(),
      githubRepo:      z.string().url().optional().or(z.literal("")),
      demoVideo:       z.string().url().optional().or(z.literal("")),
      // guideId optional — student may not know it at creation time
      guideId:         z.string().uuid().optional(),
      memberIds:       z.array(z.string().uuid()).default([]),
    });

    const data = schema.parse(req.body);
    const { userId, collegeId } = req.user!;

    const projectCode = await nextProjectCode();

    const project = await prisma.project.create({
      data: {
        projectCode,
        name:            data.name,
        description:     data.description,
        department:      data.department,
        technologyStack: data.technologyStack,
        projectType:     data.projectType,
        semester:        data.semester,
        githubRepo:      data.githubRepo || null,
        demoVideo:       data.demoVideo  || null,
        collegeId,
        // If no guide specified, default to the creating user
        guideId:         data.guideId ?? userId,
        createdById:     userId,
        members: {
          create: [
            { userId, role: "Leader" },
            ...data.memberIds
              .filter(id => id !== userId)
              .map(id => ({ userId: id, role: "Member" })),
          ],
        },
        timeline: {
          create: {
            event: "Project created",
            description: `${data.name} registered on Equipra IoT Platform.`,
          },
        },
      },
      include: projectInclude(true),
    });

    created(res, project);
  } catch (err) { next(err); }
}

// PATCH /api/projects/:id
export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const schema = z.object({
      name:            z.string().min(1).optional(),
      description:     z.string().optional(),
      department:      z.string().optional(),
      semester:        z.string().optional(),
      technologyStack: z.array(z.string()).optional(),
      projectType:     z.enum(["HARDWARE", "SOFTWARE", "HYBRID"]).optional(),
      status:          z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
      githubRepo:      z.string().optional(),
      demoVideo:       z.string().optional(),
      guideId:         z.string().uuid().optional(),
    });
    const data = schema.parse(req.body);

    const project = await prisma.project.update({
      where: { id },
      data,
      include: projectInclude(true),
    });

    ok(res, project);
  } catch (err) { next(err); }
}

// DELETE /api/projects/:id
export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    ok(res, { message: "Project deleted." });
  } catch (err) { next(err); }
}

// POST /api/projects/:id/members
export async function addMember(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      userId: z.string().uuid(),
      role:   z.string().default("Member"),
    });
    const data = schema.parse(req.body);

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId: data.userId } },
    });
    if (existing) { badRequest(res, "User is already a member."); return; }

    const member = await prisma.projectMember.create({
      data: { projectId: req.params.id, userId: data.userId, role: data.role },
      include: { user: { select: { id: true, name: true, enrollmentId: true } } },
    });

    await prisma.projectTimeline.create({
      data: {
        projectId: req.params.id,
        event: "Member added",
        description: `${member.user.name} joined as ${data.role}.`,
      },
    });

    ok(res, member);
  } catch (err) { next(err); }
}

// DELETE /api/projects/:id/members/:userId
export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    const removed = await prisma.projectMember.delete({
      where: { projectId_userId: { projectId: req.params.id, userId: req.params.userId } },
      include: { user: { select: { name: true } } },
    });

    await prisma.projectTimeline.create({
      data: {
        projectId: req.params.id,
        event: "Member removed",
        description: `${removed.user.name} was removed from the project.`,
      },
    });

    ok(res, { message: "Member removed." });
  } catch (err) { next(err); }
}

// ── Documents ────────────────────────────────────────────────

// GET /api/projects/:id/documents
export async function listDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const docs = await prisma.projectDocument.findMany({
      where: { projectId: req.params.id },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    ok(res, docs);
  } catch (err) { next(err); }
}

// POST /api/projects/:id/documents  — attach a link/document reference (no file upload; paste a URL)
export async function addDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      name: z.string().min(1),
      type: z.enum(["REPORT", "PPT", "POSTER", "CIRCUIT_DIAGRAM", "SOURCE_CODE", "VIDEO", "IMAGE", "OTHER"]).default("OTHER"),
      url:  z.string().url(),
    });
    const data = schema.parse(req.body);

    const doc = await prisma.projectDocument.create({
      data: {
        name: data.name,
        type: data.type,
        url:  data.url,
        project:    { connect: { id: req.params.id } },
        uploadedBy: { connect: { id: req.user!.userId } },
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    await prisma.projectTimeline.create({
      data: {
        projectId: req.params.id,
        event: "Document added",
        description: `${data.name} (${data.type}) was added.`,
      },
    });

    created(res, doc);
  } catch (err) { next(err); }
}

// DELETE /api/projects/:id/documents/:docId
export async function deleteDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = await prisma.projectDocument.delete({ where: { id: req.params.docId } });
    await prisma.projectTimeline.create({
      data: {
        projectId: req.params.id,
        event: "Document removed",
        description: `${doc.name} was removed.`,
      },
    });
    ok(res, { message: "Document deleted." });
  } catch (err) { next(err); }
}

// ── Equipment linking ───────────────────────────────────────────

// GET /api/projects/:id/equipment — linked equipment list
export async function listLinkedEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const links = await prisma.projectEquipment.findMany({
      where: { projectId: req.params.id },
      include: {
        equipment: { select: { id: true, name: true, emoji: true, slug: true, category: true, labLocation: true } },
        linkedBy:  { select: { id: true, name: true } },
        request:   { select: { id: true, requestCode: true, status: true } },
      },
      orderBy: { linkedAt: "desc" },
    });
    ok(res, links);
  } catch (err) { next(err); }
}

// GET /api/projects/:id/equipment/available — student's own issued equipment not yet linked to this project
export async function listLinkableEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.user!;
    const requests = await prisma.equipmentRequest.findMany({
      where: {
        studentId: userId,
        status: { in: ["issued", "approved"] },
        projectLink: null, // not already linked to any project
      },
      include: { equipment: { select: { id: true, name: true, emoji: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    });
    ok(res, requests);
  } catch (err) { next(err); }
}

// POST /api/projects/:id/equipment — { equipmentId, requestId? }
export async function linkEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      equipmentId: z.string().uuid(),
      requestId:   z.string().uuid().optional(),
    });
    const data = schema.parse(req.body);

    const existing = await prisma.projectEquipment.findUnique({
      where: { projectId_equipmentId: { projectId: req.params.id, equipmentId: data.equipmentId } },
    });
    if (existing) { badRequest(res, "This equipment is already linked to the project."); return; }

    const link = await prisma.projectEquipment.create({
      data: {
        projectId:   req.params.id,
        equipmentId: data.equipmentId,
        requestId:   data.requestId,
        linkedById:  req.user!.userId,
      },
      include: { equipment: { select: { id: true, name: true, emoji: true } } },
    });

    await prisma.projectTimeline.create({
      data: {
        projectId: req.params.id,
        event: "Equipment linked",
        description: `${link.equipment.name} linked to project.`,
      },
    });

    created(res, link);
  } catch (err) { next(err); }
}

// DELETE /api/projects/:id/equipment/:linkId
export async function unlinkEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const link = await prisma.projectEquipment.delete({
      where: { id: req.params.linkId },
      include: { equipment: { select: { name: true } } },
    });
    await prisma.projectTimeline.create({
      data: {
        projectId: req.params.id,
        event: "Equipment unlinked",
        description: `${link.equipment.name} was unlinked from the project.`,
      },
    });
    ok(res, { message: "Equipment unlinked." });
  } catch (err) { next(err); }
}
