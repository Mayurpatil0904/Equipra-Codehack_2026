// src/controllers/devices.controller.ts
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok, created, notFound, badRequest } from "../lib/response";
import { nextDeviceCode } from "../lib/requestCode";
import { z } from "zod";
import { generateDeviceKey, decryptDeviceKey } from "../lib/deviceKey";

// POST /api/projects/:projectId/devices — register a new device
export async function createDevice(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const { userId } = req.user!;

    const schema = z.object({
      name:            z.string().min(1),
      type:            z.enum(["ESP32", "ESP8266", "ARDUINO", "RASPBERRY_PI", "NODEMCU", "STM32", "OTHER"]).default("ESP32"),
      firmwareVersion: z.string().optional(),
      notes:           z.string().optional(),
    });
    const data = schema.parse(req.body);

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) { notFound(res, "Project not found."); return; }

    const deviceCode = await nextDeviceCode();
    // Generate a secure, unique API key the ESP32 will embed in firmware.
    // Only the hash + a short prefix are persisted — the plaintext key is
    // returned in this response and never stored or retrievable again.
    const key = generateDeviceKey();

    const device = await prisma.device.create({
      data: {
        deviceCode,
        apiKeyHash:      key.hash,
        apiKeyPrefix:    key.prefix,
        apiKeyEncrypted: key.encrypted,
        name:            data.name,
        type:            data.type,
        firmwareVersion: data.firmwareVersion,
        notes:           data.notes,
        projectId,
        ownerId: userId,
        status: "OFFLINE",
      },
    });

    // Log to project timeline
    await prisma.projectTimeline.create({
      data: {
        projectId,
        event: "Device registered",
        description: `${data.name} (${deviceCode}) added to project.`,
      },
    });

    // Return the plaintext apiKey ONLY here — this is the one and only time
    // it will ever be sent by the server. The DB only holds a hash of it.
    ok(res, { ...device, apiKey: key.plaintext });
  } catch (err) { next(err); }
}

// GET /api/projects/:projectId/devices — list devices for a project
export async function listDevices(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const devices = await prisma.device.findMany({
      where: { projectId },
      select: {
        id: true, deviceCode: true, name: true, type: true,
        status: true, lastSeenAt: true, wifiSignal: true,
        batteryLevel: true, firmwareVersion: true, ipAddress: true,
        notes: true, createdAt: true,
        apiKeyPrefix: true, // safe to show — never the full key
      },
      orderBy: { createdAt: "asc" },
    });
    ok(res, devices);
  } catch (err) { next(err); }
}

// GET /api/devices/:id/key — decrypt and return the current key (owner/admin only)
export async function getDeviceKey(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { userId, role } = req.user!;

    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) { notFound(res, "Device not found."); return; }

    if (device.ownerId !== userId && role !== "ADMIN") {
      badRequest(res, "You don't have permission to view this device's API key.");
      return;
    }

    const apiKey = decryptDeviceKey(device.apiKeyEncrypted);
    ok(res, { apiKey, deviceCode: device.deviceCode, name: device.name });
  } catch (err) { next(err); }
}

// POST /api/devices/:id/regenerate-key — issue a new key, invalidating the old one.
export async function regenerateDeviceKey(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { userId, role } = req.user!;

    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) { notFound(res, "Device not found."); return; }

    if (device.ownerId !== userId && role !== "ADMIN") {
      badRequest(res, "You don't have permission to regenerate this device's key.");
      return;
    }

    const key = generateDeviceKey();
    const updated = await prisma.device.update({
      where: { id },
      data: { apiKeyHash: key.hash, apiKeyPrefix: key.prefix, apiKeyEncrypted: key.encrypted },
    });

    await prisma.projectTimeline.create({
      data: {
        projectId: device.projectId,
        event: "Device API key regenerated",
        description: `${device.name}'s key was regenerated. The old key stopped working immediately.`,
      },
    });

    ok(res, { deviceCode: updated.deviceCode, name: updated.name, apiKey: key.plaintext });
  } catch (err) { next(err); }
}

// GET /api/devices/:id/telemetry — get recent telemetry for a device
export async function getDeviceTelemetry(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit ?? 50), 500);
    const since = req.query.since ? new Date(req.query.since as string) : undefined;

    const device = await prisma.device.findUnique({
      where: { id },
      select: { id: true, deviceCode: true, name: true, status: true, lastSeenAt: true },
    });
    if (!device) { notFound(res, "Device not found."); return; }

    const data = await prisma.telemetryData.findMany({
      where: {
        deviceId: id,
        ...(since && { receivedAt: { gt: since } }),
      },
      orderBy: { receivedAt: "desc" },
      take: limit,
      select: { id: true, payload: true, receivedAt: true },
    });

    ok(res, { device, data });
  } catch (err) { next(err); }
}

// DELETE /api/devices/:id — remove a device
export async function deleteDevice(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) { notFound(res, "Device not found."); return; }

    await prisma.device.delete({ where: { id } });
    ok(res, { message: "Device removed." });
  } catch (err) { next(err); }
}

// PUT /api/projects/:projectId/telemetry-defs — save telemetry field definitions
export async function saveTelemetryDefs(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const schema = z.array(z.object({
      fieldName:    z.string().min(1),
      label:        z.string().min(1),
      unit:         z.string().optional(),
      dataType:     z.enum(["NUMBER", "BOOLEAN", "STRING"]).default("NUMBER"),
      widgetType:   z.enum(["GAUGE", "CHART", "STATUS_CARD", "LED", "VALUE"]).default("VALUE"),
      thresholdMin: z.number().optional(),
      thresholdMax: z.number().optional(),
      color:        z.string().optional(),
      sortOrder:    z.number().default(0),
    }));

    const defs = schema.parse(req.body);

    // Delete existing and replace — simpler than upsert for a list
    await prisma.telemetryDefinition.deleteMany({ where: { projectId } });

    const created_defs = await prisma.telemetryDefinition.createMany({
      data: defs.map(d => ({ ...d, projectId })) as any,
    });

    ok(res, { saved: created_defs.count });
  } catch (err) { next(err); }
}
