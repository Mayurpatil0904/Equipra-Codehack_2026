// src/controllers/equipment.controller.ts

import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok, created, notFound, badRequest } from "../lib/response";
import { nextEquipmentId } from "../lib/requestCode";
import { z } from "zod";
import * as XLSX from "xlsx";
import fs from "fs";
import { uploadImage, isConfigured as cloudinaryConfigured } from "../lib/cloudinary";

// ─────────────────────────────────────────────────────────────
// ✅ NEW — release any units whose 24h post-return hold has expired.
// Called lazily whenever equipment is listed/fetched, so no cron job
// is required. Cheap: only touches rows that actually have a pending
// release due.
// ─────────────────────────────────────────────────────────────
async function releaseExpiredHolds() {
  const now = new Date();

  const due = await prisma.equipment.findMany({
    where: {
      pendingUnits: { gt: 0 },
      availableAt: { lte: now },
    },
    select: { id: true, pendingUnits: true, availableUnits: true, totalUnits: true, name: true },
  });

  for (const eq of due) {
    await prisma.$transaction([
      prisma.equipment.update({
        where: { id: eq.id },
        data: {
          availableUnits: { increment: eq.pendingUnits },
          pendingUnits: 0,
          availableAt: null,
          availabilityStatus: "available",
        },
      }),
      prisma.equipmentTimeline.create({
        data: {
          equipmentId: eq.id,
          description: `${eq.pendingUnits} unit(s) released from 24h post-return hold — now available.`,
          status: "success",
        },
      }),
    ]);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/equipment
// ✅ Role-based visibility:
//   - STUDENT  → sees department-matched + general (department=null)
//                equipment, only where visibleToStudents = true
//   - FACULTY / ADMIN → sees everything in their college (no filter)
// ─────────────────────────────────────────────────────────────
export async function listEquipment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await releaseExpiredHolds();

    const { category, status, q } = req.query as Record<string, string>;

    // Determine requester's department for student-scoped visibility
    let visibilityFilter: any = {};
    if (req.user?.role === "STUDENT") {
      const me = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { department: true },
      });

      visibilityFilter = {
        visibleToStudents: true,
        OR: [
          { department: null },
          { department: me?.department ?? "__none__" },
        ],
      };
    }

    const items = await prisma.equipment.findMany({
      where: {
        isActive: true,
        ...visibilityFilter,

        ...(category && { category }),

        ...(status && {
          availabilityStatus: status as any,
        }),

        ...(q && {
          OR: [
            { name:        { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { category:    { contains: q, mode: "insensitive" } },
            { equipmentId: { contains: q, mode: "insensitive" } },
          ],
        }),
      },

      include: {
        // ✅ Limit to latest 5 timeline entries for the inventory/detail
        // view — full history is available via the Fault Scan lookup.
        timeline: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },

      orderBy: { name: "asc" },
    });

    ok(res, items);
  } catch (err) {
    next(err);
  }
}

// GET /api/equipment/:slug
export async function getEquipment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await releaseExpiredHolds();

    const item = await prisma.equipment.findUnique({
      where: { slug: req.params.slug },

      include: {
        // ✅ Latest 5 only — matches Inventory detail view requirement
        timeline: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },

        faultScans: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            scannedBy: { select: { name: true, enrollmentId: true } },
          },
        },
      },
    });

    if (!item) {
      notFound(res, "Equipment not found.");
      return;
    }

    ok(res, item);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/equipment/lookup/:equipmentId
// ✅ NEW — used by the Fault Scan page. Looks up equipment by its
// human-readable ID (e.g. EQ-0001) and returns FULL timeline history
// (not limited to 5), for inspection/audit purposes.
// ─────────────────────────────────────────────────────────────
export async function getEquipmentByEquipmentId(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await releaseExpiredHolds();

    const raw = req.params.equipmentId.trim().toUpperCase();

    const item = await prisma.equipment.findFirst({
      where: {
        OR: [
          { equipmentId: raw },
          { equipmentId: raw.startsWith("EQ-") ? raw : `EQ-${raw}` },
          { slug: req.params.equipmentId.trim() },
        ],
      },
      include: {
        // ✅ FULL history here — no take limit
        timeline: { orderBy: { createdAt: "desc" } },
        faultScans: {
          orderBy: { createdAt: "desc" },
          include: {
            scannedBy: { select: { name: true, enrollmentId: true } },
          },
        },
      },
    });

    if (!item) {
      notFound(res, "No equipment found with that ID.");
      return;
    }

    ok(res, item);
  } catch (err) {
    next(err);
  }
}

// POST /api/equipment
export async function createEquipment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const schema = z.object({
      // ✅ FIX — accept an empty string from the frontend (when the
      // optional "URL Slug" field is left blank) by treating "" as
      // undefined, so the auto-generated slug below kicks in instead
      // of failing min(1) validation.
      slug: z.preprocess(
        (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
        z.string().min(1).optional()
      ),

      name: z.string().min(1),

      category: z.string().min(1),

      // ✅ FIX — description is now optional. If left blank, a sensible
      // default is generated from name/category/lab so the detail page
      // never shows an empty description.
      description: z.preprocess(
        (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
        z.string().min(1).optional()
      ),

      typicalUses: z.array(z.string()).default([]),

      labLocation: z.string().min(1),

      supervisorName: z.string().min(1),

      availabilityStatus: z
        .enum(["available", "issued", "reserved", "maintenance", "inspection"])
        .default("available"),

      conditionLog: z.string().default(""),

      emoji: z.string().default("📦"),

      totalUnits: z.number().int().min(1).default(1),

      // ✅ NEW — department-scoped visibility
      // null/omitted = general equipment, visible to all departments
      department: z.string().optional().nullable(),

      // ✅ NEW — set false to hide from students entirely (faculty/admin only)
      visibleToStudents: z.boolean().default(true),

      // Cloudinary image — base64 string from frontend
      image: z.string().optional(),
    });

    const parsedData = schema.parse(req.body);

    const slug =
      parsedData.slug ||
      parsedData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // ✅ NEW — auto-generate the human-readable equipment ID (EQ-0001, ...)
    const equipmentId = await nextEquipmentId();

    // ✅ Auto-generate a description if the admin left it blank
    const description =
      parsedData.description ??
      `${parsedData.name} — ${parsedData.category} equipment located in ${parsedData.labLocation}.`;

    // Upload image to Cloudinary if provided
    let imageUrl: string | undefined;
    if (parsedData.image && cloudinaryConfigured()) {
      try {
        imageUrl = await uploadImage(parsedData.image);
        console.log(`[CLOUDINARY] ✅ Uploaded image for ${parsedData.name}`);
      } catch (err: any) {
        console.error(`[CLOUDINARY] ❌ Upload failed: ${err.message}`);
      }
    }

    const { image: _img, ...rest } = parsedData;
    const data: any = {
      ...rest,
      description,
      slug,
      equipmentId,
      availableUnits: rest.totalUnits,
      ...(imageUrl && { imageUrl }),
    };

    const item = await prisma.equipment.create({ data });

    // Create initial timeline entry
    await prisma.equipmentTimeline.create({
      data: {
        equipmentId: item.id,
        description: `Equipment added to inventory (ID: ${equipmentId})`,
        status: "success",
      },
    });

    created(res, item);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/equipment/:slug
export async function updateEquipment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const item = await prisma.equipment.findUnique({
      where: { slug: req.params.slug },
    });

    if (!item) {
      notFound(res, "Equipment not found.");
      return;
    }

    // ✅ Never allow equipmentId or slug to be overwritten via update —
    // both are assigned once at creation and used as permanent lookup keys
    // (equipmentId for Fault Scan history, slug for the page URL/QR links).
    const { equipmentId, slug, image, ...safeBody } = req.body;

    // Upload new image if provided
    if (image && cloudinaryConfigured()) {
      try {
        safeBody.imageUrl = await uploadImage(image);
        console.log(`[CLOUDINARY] ✅ Updated image for ${item.name}`);
      } catch (err: any) {
        console.error(`[CLOUDINARY] ❌ Upload failed: ${err.message}`);
      }
    }

    const updated = await prisma.equipment.update({
      where: { slug: req.params.slug },
      data: safeBody,
    });

    ok(res, updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/equipment/:slug
export async function deleteEquipment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await prisma.equipment.update({
      where: { slug: req.params.slug },
      data: { isActive: false },
    });

    ok(res, { message: "Equipment removed from inventory." });
  } catch (err) {
    next(err);
  }
}

// GET /api/equipment/categories
export async function getCategories(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const rows = await prisma.equipment.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    ok(res, rows.map((r) => r.category));
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/equipment/bulk-upload-template
// ✅ NEW — generates a downloadable .xlsx template so admins know
// exactly which columns to fill when onboarding a whole department's
// worth of equipment at once.
// ─────────────────────────────────────────────────────────────
export async function downloadBulkUploadTemplate(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const headers = [
      "name", "category", "description", "department",
      "labLocation", "supervisorName", "totalUnits",
      "emoji", "visibleToStudents", "typicalUses",
    ];

    const exampleRows = [
      {
        name: "ESP32 DevKit V1",
        category: "Microcontrollers",
        description: "Wi-Fi + Bluetooth dev board for IoT prototyping",
        department: "Computer Science",
        labLocation: "Lab 204",
        supervisorName: "Dr. Mehta",
        totalUnits: 25,
        emoji: "📟",
        visibleToStudents: true,
        typicalUses: "IoT Prototyping, Sensor Integration",
      },
      {
        name: "Digital Multimeter",
        category: "Measurement Tools",
        description: "",
        // leave department blank to make it visible to ALL departments
        department: "",
        labLocation: "Lab 101",
        supervisorName: "Mr. Sharma",
        totalUnits: 10,
        emoji: "🔧",
        visibleToStudents: true,
        typicalUses: "",
      },
    ];

    const sheet = XLSX.utils.json_to_sheet(exampleRows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Equipment");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="equipra-equipment-template.xlsx"'
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/equipment/bulk-upload
// ✅ NEW — bulk-create equipment from an uploaded Excel/CSV file.
// Required columns: name, category, labLocation, supervisorName
// Optional: description, department, totalUnits, emoji,
//           visibleToStudents, typicalUses (comma-separated)
//
// Mirrors the same parse → validate → create pattern already proven
// in teams.controller.ts's uploadMembers().
// ─────────────────────────────────────────────────────────────
export async function bulkUploadEquipment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.file) {
      badRequest(res, "No file uploaded.");
      return;
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    // Clean up the temp file regardless of outcome
    fs.unlinkSync(req.file.path);

    if (!rows.length) {
      badRequest(res, "Excel file is empty or has no valid rows.");
      return;
    }

    const results = {
      added: [] as any[],
      skipped: [] as { row: number; reason: string; name?: string }[],
    };

    // ✅ Processed sequentially (not Promise.all) — nextEquipmentId()
    // uses an atomic counter upsert, but going row-by-row keeps the
    // generated IDs in clean, predictable ascending order matching
    // the order rows appear in the spreadsheet.
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 = 1-indexed + header row

      const name = String(row.name ?? "").trim();
      const category = String(row.category ?? "").trim();
      const labLocation = String(row.labLocation ?? "").trim();
      const supervisorName = String(row.supervisorName ?? "").trim();

      if (!name || !category || !labLocation || !supervisorName) {
        results.skipped.push({
          row: rowNum,
          name: name || undefined,
          reason: "Missing required field (name, category, labLocation, or supervisorName).",
        });
        continue;
      }

      const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

      // Skip if a slug collision already exists — avoids silently
      // overwriting or crashing the whole batch on a duplicate name.
      const existing = await prisma.equipment.findUnique({ where: { slug } });
      if (existing) {
        results.skipped.push({
          row: rowNum,
          name,
          reason: `Equipment with a matching name/slug ("${slug}") already exists.`,
        });
        continue;
      }

      const totalUnitsRaw = Number(row.totalUnits);
      const totalUnits = Number.isFinite(totalUnitsRaw) && totalUnitsRaw > 0 ? Math.floor(totalUnitsRaw) : 1;

      const departmentRaw = String(row.department ?? "").trim();
      const department = departmentRaw === "" ? null : departmentRaw;

      // Excel booleans can arrive as actual booleans, "TRUE"/"FALSE" strings,
      // or be omitted entirely — normalize all of those to a real boolean.
      const visibleRaw = row.visibleToStudents;
      const visibleToStudents =
        visibleRaw === undefined || visibleRaw === ""
          ? true
          : visibleRaw === true || String(visibleRaw).trim().toUpperCase() === "TRUE";

      const typicalUses = String(row.typicalUses ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const description =
        String(row.description ?? "").trim() ||
        `${name} — ${category} equipment located in ${labLocation}.`;

      const equipmentId = await nextEquipmentId();

      const item = await prisma.equipment.create({
        data: {
          slug,
          equipmentId,
          name,
          category,
          description,
          typicalUses,
          labLocation,
          supervisorName,
          totalUnits,
          availableUnits: totalUnits,
          department,
          visibleToStudents,
          emoji: String(row.emoji ?? "").trim() || "📦",
        },
      });

      await prisma.equipmentTimeline.create({
        data: {
          equipmentId: item.id,
          description: `Equipment added to inventory via bulk upload (ID: ${equipmentId})`,
          status: "success",
        },
      });

      results.added.push({ name: item.name, equipmentId: item.equipmentId, slug: item.slug });
    }

    ok(res, {
      message: `${results.added.length} of ${rows.length} row(s) added successfully.`,
      ...results,
    });
  } catch (err) {
    next(err);
  }
}
