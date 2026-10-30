// src/controllers/telemetry.controller.ts
//
// This is the heart of the IoT module.
// ESP32 sends HTTP POST to /api/telemetry with its API key + sensor data.
// No login required — the API key IS the authentication.
//
// Example ESP32 payload:
// POST /api/telemetry
// Headers: X-API-Key: ek_abc123...
// Body: { "temperature": 32.5, "gasLevel": 180, "zone1": true, "zone2": false }

import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok, badRequest } from "../lib/response";
import { hashDeviceKey } from "../lib/deviceKey";
import { inferField } from "../lib/autoLayout";
import { emitTelemetry, emitDeviceStatus } from "../lib/socket";

// ─────────────────────────────────────────────────────────────
// POST /api/telemetry
// Public endpoint — authenticated by X-API-Key header only.
// This is what the ESP32 calls every N seconds.
// ─────────────────────────────────────────────────────────────
export async function ingestTelemetry(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = (req.headers["x-api-key"] as string)?.trim();

    if (!apiKey) {
      res.status(401).json({ success: false, message: "Missing X-API-Key header." });
      return;
    }

    // Look up device by the hash of the presented key — we never store
    // or compare plaintext keys.
    const device = await prisma.device.findUnique({
      where: { apiKeyHash: hashDeviceKey(apiKey) },
      select: {
        id: true, deviceCode: true, name: true,
        projectId: true, status: true,
      },
    });

    if (!device) {
      res.status(401).json({ success: false, message: "Invalid API key." });
      return;
    }

    const payload = req.body;

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      badRequest(res, "Body must be a JSON object of sensor readings.");
      return;
    }

    // Extract optional metadata the ESP32 can optionally include
    // These are stripped from the telemetry payload and stored on the device
    const wifiSignal    = typeof payload.__wifi    === "number" ? payload.__wifi    : undefined;
    const batteryLevel  = typeof payload.__battery === "number" ? payload.__battery : undefined;
    const ipAddress     = typeof payload.__ip      === "string" ? payload.__ip      : undefined;
    const firmwareVer   = typeof payload.__fw      === "string" ? payload.__fw      : undefined;

    // Remove meta fields from payload before storing
    const cleanPayload = { ...payload };
    delete cleanPayload.__wifi;
    delete cleanPayload.__battery;
    delete cleanPayload.__ip;
    delete cleanPayload.__fw;

    const now = new Date();

    // Store telemetry row + update device status/metadata in one transaction
    const [telemetry] = await prisma.$transaction([
      prisma.telemetryData.create({
        data: {
          deviceId:  device.id,
          payload:   cleanPayload,
          receivedAt: now,
        },
        select: { id: true, payload: true, receivedAt: true },
      }),
      prisma.device.update({
        where: { id: device.id },
        data: {
          status:         "ONLINE",
          lastSeenAt:     now,
          ...(wifiSignal   !== undefined && { wifiSignal }),
          ...(batteryLevel !== undefined && { batteryLevel }),
          ...(ipAddress    !== undefined && { ipAddress }),
          ...(firmwareVer  !== undefined && { firmwareVersion: firmwareVer }),
        },
      }),
    ]);

    // Check thresholds and create alerts if any field crosses a limit
    await checkThresholds(device.projectId, device.id, cleanPayload, now);

    // Auto-select a dashboard layout: any field never seen before for this
    // project gets a sensible widget/label/unit inferred from its data type,
    // so the dashboard fills itself in as new sensors come online.
    await autoConfigureTelemetryDefs(device.projectId, cleanPayload);

    // Trim old telemetry — keep only last 1000 rows per device
    // (fire and forget — don't await, don't block the response)
    trimOldTelemetry(device.id).catch(() => {});

    // ✅ Push to all WebSocket clients watching this project
    emitTelemetry(device.projectId, device.id, cleanPayload);
    emitDeviceStatus(device.projectId, device.id, "online");

    ok(res, {
      received: true,
      deviceCode: device.deviceCode,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/telemetry/live/:deviceId
// Polling endpoint — frontend calls this every 3 seconds
// to get the latest sensor reading for a device.
// ─────────────────────────────────────────────────────────────
export async function getLiveReading(req: Request, res: Response, next: NextFunction) {
  try {
    const { deviceId } = req.params;

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: {
        id: true, deviceCode: true, name: true, type: true,
        status: true, lastSeenAt: true, wifiSignal: true,
        batteryLevel: true, ipAddress: true, firmwareVersion: true,
        apiKeyPrefix: true,
        project: {
          select: {
            id: true, name: true, projectCode: true,
            telemetryDefs: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });

    if (!device) {
      res.status(404).json({ success: false, message: "Device not found." });
      return;
    }

    // Mark device OFFLINE if no data for > 30 seconds
    const isOnline = device.lastSeenAt &&
      (Date.now() - device.lastSeenAt.getTime()) < 30_000;

    if (!isOnline && device.status === "ONLINE") {
      await prisma.device.update({
        where: { id: deviceId },
        data: { status: "OFFLINE" },
      }).catch(() => {});
    }

    // Latest telemetry row
    const latest = await prisma.telemetryData.findFirst({
      where: { deviceId },
      orderBy: { receivedAt: "desc" },
      select: { id: true, payload: true, receivedAt: true },
    });

    ok(res, {
      device: { ...device, status: isOnline ? "ONLINE" : "OFFLINE" },
      latest,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/telemetry/history/:deviceId
// Returns last N telemetry rows for charting.
// ─────────────────────────────────────────────────────────────
export async function getTelemetryHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const { deviceId } = req.params;
    const limit  = Math.min(Number(req.query.limit  ?? 100), 500);
    const field  = req.query.field  as string | undefined;
    const since  = req.query.since  ? new Date(req.query.since as string) : undefined;

    const rows = await prisma.telemetryData.findMany({
      where: {
        deviceId,
        ...(since && { receivedAt: { gt: since } }),
      },
      orderBy: { receivedAt: "asc" },
      take: limit,
      select: { id: true, payload: true, receivedAt: true },
    });

    // If a specific field is requested, extract just that value per row
    if (field) {
      const series = rows.map(r => ({
        t: r.receivedAt,
        v: (r.payload as any)[field] ?? null,
      }));
      ok(res, { field, series, count: series.length });
      return;
    }

    ok(res, { rows, count: rows.length });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

// Check if any telemetry value crosses a defined threshold
async function checkThresholds(
  projectId: string,
  deviceId: string,
  payload: Record<string, any>,
  now: Date
) {
  try {
    const defs = await prisma.telemetryDefinition.findMany({
      where: {
        projectId,
        OR: [
          { thresholdMin: { not: null } },
          { thresholdMax: { not: null } },
        ],
      },
    });

    for (const def of defs) {
      const value = payload[def.fieldName];
      if (typeof value !== "number") continue;

      let triggered = false;
      let message = "";

      if (def.thresholdMax !== null && value > def.thresholdMax) {
        triggered = true;
        message = `${def.label} is ${value}${def.unit ?? ""} — above maximum threshold of ${def.thresholdMax}${def.unit ?? ""}.`;
      } else if (def.thresholdMin !== null && value < def.thresholdMin) {
        triggered = true;
        message = `${def.label} is ${value}${def.unit ?? ""} — below minimum threshold of ${def.thresholdMin}${def.unit ?? ""}.`;
      }

      if (triggered) {
        // Check if there's already an unresolved alert for this field
        // to avoid spamming one alert per reading
        const existing = await prisma.projectTimeline.findFirst({
          where: {
            projectId,
            event: "ALERT",
            description: { contains: def.fieldName },
            createdAt: { gt: new Date(now.getTime() - 60_000) }, // within last 60s
          },
        });

        if (!existing) {
          await prisma.projectTimeline.create({
            data: {
              projectId,
              event: "ALERT",
              description: `[${def.fieldName}] ${message}`,
            },
          });
        }
      }
    }
  } catch {
    // Threshold checking is best-effort — never block the main ingest
  }
}

// Auto-select a layout for any telemetry field this project hasn't seen
// before. Existing definitions (including anything a student manually
// customized in TelemetryConfigModal) are never touched or overwritten —
// this only fills in the gaps for brand-new fields.
async function autoConfigureTelemetryDefs(projectId: string, payload: Record<string, any>) {
  try {
    const fieldNames = Object.keys(payload);
    if (fieldNames.length === 0) return;

    const existing = await prisma.telemetryDefinition.findMany({
      where: { projectId, fieldName: { in: fieldNames } },
      select: { fieldName: true },
    });
    const known = new Set(existing.map(d => d.fieldName));
    const newFields = fieldNames.filter(f => !known.has(f));
    if (newFields.length === 0) return;

    // Continue sortOrder from wherever the project's existing defs left off
    const maxOrder = await prisma.telemetryDefinition.aggregate({
      where: { projectId },
      _max: { sortOrder: true },
    });
    let nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const inferred = newFields.map(fieldName => {
      const field = inferField(fieldName, payload[fieldName]);
      return { ...field, projectId, sortOrder: nextOrder++ };
    });

    // skipDuplicates guards against a race if two readings with the same
    // brand-new field arrive milliseconds apart.
    const result = await prisma.telemetryDefinition.createMany({
      data: inferred,
      skipDuplicates: true,
    });

    if (result.count > 0) {
      await prisma.projectTimeline.create({
        data: {
          projectId,
          event: "Dashboard auto-configured",
          description: `Auto-detected ${result.count} new sensor field${result.count > 1 ? "s" : ""}: ${newFields.join(", ")}.`,
        },
      });
    }
  } catch {
    // Best-effort — never block telemetry ingestion over a layout guess
  }
}

// Keep only last 1000 rows per device to prevent unbounded DB growth
async function trimOldTelemetry(deviceId: string) {
  const count = await prisma.telemetryData.count({ where: { deviceId } });
  if (count <= 1000) return;

  const oldest = await prisma.telemetryData.findMany({
    where: { deviceId },
    orderBy: { receivedAt: "asc" },
    take: count - 1000,
    select: { id: true },
  });

  await prisma.telemetryData.deleteMany({
    where: { id: { in: oldest.map(r => r.id) } },
  });
}
