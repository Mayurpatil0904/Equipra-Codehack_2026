// src/controllers/competitions.controller.ts
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok, created, notFound, badRequest } from "../lib/response";
import { z } from "zod";

// ── Competitions CRUD (admin-only for create/update/delete) ───

// GET /api/competitions — list all competitions
export async function listCompetitions(req: Request, res: Response, next: NextFunction) {
  try {
    const { active } = req.query;
    const competitions = await prisma.competition.findMany({
      where: active === "true" ? { isActive: true } : {},
      include: { _count: { select: { entries: true } } },
      orderBy: { createdAt: "desc" },
    });
    ok(res, competitions);
  } catch (err) { next(err); }
}

// GET /api/competitions/:id — single competition with entries
export async function getCompetition(req: Request, res: Response, next: NextFunction) {
  try {
    const comp = await prisma.competition.findUnique({
      where: { id: req.params.id },
      include: {
        entries: {
          include: {
            project:     { select: { id: true, name: true, projectCode: true, projectType: true, department: true } },
            submittedBy: { select: { id: true, name: true, enrollmentId: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { entries: true } },
      },
    });
    if (!comp) { notFound(res, "Competition not found."); return; }
    ok(res, comp);
  } catch (err) { next(err); }
}

// POST /api/competitions — create a competition (admin only)
export async function createCompetition(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      name:        z.string().min(1),
      organizer:   z.string().optional(),
      deadline:    z.string().optional(),
      description: z.string().optional(),
      website:     z.string().url().optional().or(z.literal("")),
    });
    const data = schema.parse(req.body);

    const comp = await prisma.competition.create({
      data: {
        name:        data.name,
        organizer:   data.organizer,
        deadline:    data.deadline ? new Date(data.deadline) : null,
        description: data.description,
        website:     data.website || null,
      },
    });
    created(res, comp);
  } catch (err) { next(err); }
}

// PATCH /api/competitions/:id — update competition
export async function updateCompetition(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      name:        z.string().min(1).optional(),
      organizer:   z.string().optional(),
      deadline:    z.string().optional().nullable(),
      description: z.string().optional(),
      website:     z.string().optional(),
      isActive:    z.boolean().optional(),
    });
    const data = schema.parse(req.body);

    const comp = await prisma.competition.update({
      where: { id: req.params.id },
      data: {
        ...data,
        deadline: data.deadline !== undefined
          ? (data.deadline ? new Date(data.deadline) : null)
          : undefined,
      },
    });
    ok(res, comp);
  } catch (err) { next(err); }
}

// DELETE /api/competitions/:id
export async function deleteCompetition(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.competition.delete({ where: { id: req.params.id } });
    ok(res, { message: "Competition deleted." });
  } catch (err) { next(err); }
}

// ── Competition Entries ──────────────────────────────────────

// POST /api/competitions/:id/entries — submit a project to a competition
export async function submitEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      projectId:    z.string().uuid(),
      proposal:     z.string().url().optional().or(z.literal("")),
      presentation: z.string().url().optional().or(z.literal("")),
      report:       z.string().url().optional().or(z.literal("")),
      video:        z.string().url().optional().or(z.literal("")),
      poster:       z.string().url().optional().or(z.literal("")),
      notes:        z.string().optional(),
    });
    const data = schema.parse(req.body);

    // Check duplicate
    const existing = await prisma.competitionEntry.findUnique({
      where: { projectId_competitionId: { projectId: data.projectId, competitionId: req.params.id } },
    });
    if (existing) { badRequest(res, "This project is already entered in this competition."); return; }

    const entry = await prisma.competitionEntry.create({
      data: {
        competitionId: req.params.id,
        projectId:     data.projectId,
        submittedById: req.user!.userId,
        status:        "SUBMITTED",
        proposal:      data.proposal || null,
        presentation:  data.presentation || null,
        report:        data.report || null,
        video:         data.video || null,
        poster:        data.poster || null,
        notes:         data.notes,
      },
      include: {
        project:     { select: { id: true, name: true, projectCode: true } },
        submittedBy: { select: { id: true, name: true } },
      },
    });
    created(res, entry);
  } catch (err) { next(err); }
}

// PATCH /api/competitions/entries/:entryId — update entry (links, status)
export async function updateEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      status:       z.enum(["DRAFT", "SUBMITTED", "ACCEPTED", "REJECTED"]).optional(),
      proposal:     z.string().optional().nullable(),
      presentation: z.string().optional().nullable(),
      report:       z.string().optional().nullable(),
      video:        z.string().optional().nullable(),
      poster:       z.string().optional().nullable(),
      notes:        z.string().optional(),
    });
    const data = schema.parse(req.body);

    const entry = await prisma.competitionEntry.update({
      where: { id: req.params.entryId },
      data,
      include: {
        project:     { select: { id: true, name: true, projectCode: true } },
        submittedBy: { select: { id: true, name: true } },
      },
    });
    ok(res, entry);
  } catch (err) { next(err); }
}

// DELETE /api/competitions/entries/:entryId
export async function deleteEntry(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.competitionEntry.delete({ where: { id: req.params.entryId } });
    ok(res, { message: "Entry withdrawn." });
  } catch (err) { next(err); }
}

// GET /api/competitions/my-entries — all entries by the logged-in user
export async function myEntries(req: Request, res: Response, next: NextFunction) {
  try {
    const entries = await prisma.competitionEntry.findMany({
      where: { submittedById: req.user!.userId },
      include: {
        project:     { select: { id: true, name: true, projectCode: true } },
        competition: { select: { id: true, name: true, deadline: true, organizer: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    ok(res, entries);
  } catch (err) { next(err); }
}
