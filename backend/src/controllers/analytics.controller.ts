// src/controllers/analytics.controller.ts
//
// Phase 7 — AI-Assisted Analytics Module
// Uses statistical methods (moving average, trend detection, anomaly detection)
// to provide health scores, predictions, and recommendations.
// No external ML dependencies required.

import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok, notFound } from "../lib/response";

// ─── Types ────────────────────────────────────────────────────
interface FieldAnalysis {
  fieldName:     string;
  label:         string;
  unit:          string | null;
  currentValue:  number | null;
  mean:          number;
  stdDev:        number;
  min:           number;
  max:           number;
  trend:         "rising" | "falling" | "stable" | "insufficient_data";
  trendStrength: number;         // 0–1 slope magnitude normalised
  isAnomaly:     boolean;
  anomalyScore:  number;         // 0 = normal, 1 = extreme
  thresholdMin:  number | null;
  thresholdMax:  number | null;
  prediction:    string | null;  // "Approaching max threshold in ~5 readings"
  riskLevel:     "safe" | "warning" | "danger";
}

interface ProjectAnalytics {
  projectId:       string;
  projectName:     string;
  healthScore:     number;       // 0–100
  healthLabel:     string;       // "Excellent" | "Good" | "Fair" | "Poor" | "Critical"
  overallRisk:     "safe" | "warning" | "danger";
  totalReadings:   number;
  deviceCount:     number;
  onlineDevices:   number;
  lastDataAt:      string | null;
  fields:          FieldAnalysis[];
  recommendations: string[];
  alerts:          { field: string; message: string; severity: "warning" | "danger" }[];
}

// ─── Helpers ──────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr: number[], avg: number): number {
  if (arr.length < 2) return 0;
  const variance = arr.reduce((s, v) => s + (v - avg) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// Simple linear regression slope
function trendSlope(values: number[]): number {
  if (values.length < 3) return 0;
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX  += i;
    sumY  += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

// Moving average (last `window` values)
function movingAvg(values: number[], window: number): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-window);
  return mean(slice);
}

// Z-score anomaly detection
function anomalyScore(value: number, avg: number, sd: number): number {
  if (sd === 0) return 0;
  return Math.abs((value - avg) / sd);
}

// Predict readings until threshold breach
function predictThresholdBreachMsg(
  current: number, slope: number,
  thresholdMin: number | null, thresholdMax: number | null
): string | null {
  if (slope === 0) return null;

  if (thresholdMax !== null && slope > 0 && current < thresholdMax) {
    const readingsToBreach = Math.ceil((thresholdMax - current) / slope);
    if (readingsToBreach > 0 && readingsToBreach <= 50) {
      return `Rising toward max threshold (${thresholdMax}). May breach in ~${readingsToBreach} readings.`;
    }
  }

  if (thresholdMin !== null && slope < 0 && current > thresholdMin) {
    const readingsToBreach = Math.ceil((current - thresholdMin) / Math.abs(slope));
    if (readingsToBreach > 0 && readingsToBreach <= 50) {
      return `Falling toward min threshold (${thresholdMin}). May breach in ~${readingsToBreach} readings.`;
    }
  }

  return null;
}

function healthLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 25) return "Poor";
  return "Critical";
}

// ─── Main Endpoint ────────────────────────────────────────────
// GET /api/analytics/:projectId
export async function getProjectAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;

    // Fetch project with definitions and devices
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        telemetryDefs: { orderBy: { sortOrder: "asc" } },
        devices: {
          select: { id: true, status: true, lastSeenAt: true, name: true, deviceCode: true },
        },
      },
    });

    if (!project) { notFound(res, "Project not found."); return; }

    // Get last 200 telemetry rows across all devices (most recent first)
    const deviceIds = project.devices.map(d => d.id);
    const rows = deviceIds.length > 0 ? await prisma.telemetryData.findMany({
      where: { deviceId: { in: deviceIds } },
      orderBy: { receivedAt: "desc" },
      take: 200,
      select: { payload: true, receivedAt: true },
    }) : [];

    // Reverse to get chronological order for trend analysis
    rows.reverse();

    const numericDefs = project.telemetryDefs.filter(d => d.dataType === "NUMBER");
    const fieldAnalyses: FieldAnalysis[] = [];
    const recommendations: string[] = [];
    const alerts: { field: string; message: string; severity: "warning" | "danger" }[] = [];
    let healthPoints = 100;

    for (const def of numericDefs) {
      // Extract this field's values from all rows
      const values: number[] = [];
      for (const row of rows) {
        const v = (row.payload as any)?.[def.fieldName];
        if (typeof v === "number" && isFinite(v)) values.push(v);
      }

      if (values.length === 0) {
        fieldAnalyses.push({
          fieldName:     def.fieldName,
          label:         def.label,
          unit:          def.unit,
          currentValue:  null,
          mean:          0,
          stdDev:        0,
          min:           0,
          max:           0,
          trend:         "insufficient_data",
          trendStrength: 0,
          isAnomaly:     false,
          anomalyScore:  0,
          thresholdMin:  def.thresholdMin,
          thresholdMax:  def.thresholdMax,
          prediction:    null,
          riskLevel:     "safe",
        });
        continue;
      }

      const currentVal = values[values.length - 1];
      const avg   = mean(values);
      const sd    = stdDev(values, avg);
      const slope = trendSlope(values);
      const minV  = Math.min(...values);
      const maxV  = Math.max(...values);
      const aScore = anomalyScore(currentVal, avg, sd);
      const isAnom = aScore > 2.5; // beyond 2.5 standard deviations

      // Determine trend
      const range = maxV - minV || 1;
      const normalizedSlope = Math.abs(slope) / range;
      let trend: FieldAnalysis["trend"] = "stable";
      if (values.length < 5) {
        trend = "insufficient_data";
      } else if (normalizedSlope > 0.02) {
        trend = slope > 0 ? "rising" : "falling";
      }

      // Prediction
      const prediction = predictThresholdBreachMsg(currentVal, slope, def.thresholdMin, def.thresholdMax);

      // Risk level
      let riskLevel: FieldAnalysis["riskLevel"] = "safe";
      if (def.thresholdMax !== null && currentVal > def.thresholdMax) {
        riskLevel = "danger";
        healthPoints -= 20;
        alerts.push({
          field: def.label,
          message: `${def.label} is ${currentVal}${def.unit ?? ""} — ABOVE max threshold of ${def.thresholdMax}${def.unit ?? ""}.`,
          severity: "danger",
        });
        recommendations.push(`⚠️ ${def.label} exceeded safe limits. Inspect immediately.`);
      } else if (def.thresholdMin !== null && currentVal < def.thresholdMin) {
        riskLevel = "danger";
        healthPoints -= 20;
        alerts.push({
          field: def.label,
          message: `${def.label} is ${currentVal}${def.unit ?? ""} — BELOW min threshold of ${def.thresholdMin}${def.unit ?? ""}.`,
          severity: "danger",
        });
        recommendations.push(`⚠️ ${def.label} below safe limits. Check sensor or environment.`);
      } else if (prediction) {
        riskLevel = "warning";
        healthPoints -= 8;
        alerts.push({ field: def.label, message: prediction, severity: "warning" });
      }

      if (isAnom) {
        healthPoints -= 10;
        recommendations.push(`🔍 ${def.label} shows unusual reading (${currentVal}${def.unit ?? ""}). Verify sensor.`);
      }

      if (trend === "rising" && def.thresholdMax !== null) {
        recommendations.push(`📈 ${def.label} has a rising trend. Monitor closely.`);
      }
      if (trend === "falling" && def.thresholdMin !== null) {
        recommendations.push(`📉 ${def.label} has a falling trend. Check for issues.`);
      }

      fieldAnalyses.push({
        fieldName:     def.fieldName,
        label:         def.label,
        unit:          def.unit,
        currentValue:  currentVal,
        mean:          Math.round(avg * 100) / 100,
        stdDev:        Math.round(sd * 100) / 100,
        min:           Math.round(minV * 100) / 100,
        max:           Math.round(maxV * 100) / 100,
        trend,
        trendStrength: Math.round(normalizedSlope * 1000) / 1000,
        isAnomaly:     isAnom,
        anomalyScore:  Math.round(aScore * 100) / 100,
        thresholdMin:  def.thresholdMin,
        thresholdMax:  def.thresholdMax,
        prediction,
        riskLevel,
      });
    }

    // Device health penalties
    const onlineDevices = project.devices.filter(d => {
      if (!d.lastSeenAt) return false;
      return (Date.now() - new Date(d.lastSeenAt).getTime()) < 30_000;
    }).length;

    const offlineDevices = project.devices.length - onlineDevices;
    if (offlineDevices > 0) {
      healthPoints -= offlineDevices * 5;
      recommendations.push(`📡 ${offlineDevices} device(s) offline. Check connectivity.`);
    }

    if (rows.length === 0 && project.devices.length > 0) {
      healthPoints -= 15;
      recommendations.push("📊 No telemetry data received yet. Ensure devices are sending data.");
    }

    if (project.devices.length === 0) {
      healthPoints = 50; // No devices = can't assess
      recommendations.push("🔌 No devices registered. Add a device to start monitoring.");
    }

    // Clamp health score
    healthPoints = Math.max(0, Math.min(100, healthPoints));

    const lastRow = rows.length > 0 ? rows[rows.length - 1] : null;

    const overallRisk: ProjectAnalytics["overallRisk"] =
      alerts.some(a => a.severity === "danger") ? "danger" :
      alerts.some(a => a.severity === "warning") ? "warning" : "safe";

    const result: ProjectAnalytics = {
      projectId:       project.id,
      projectName:     project.name,
      healthScore:     healthPoints,
      healthLabel:     healthLabel(healthPoints),
      overallRisk,
      totalReadings:   rows.length,
      deviceCount:     project.devices.length,
      onlineDevices,
      lastDataAt:      lastRow?.receivedAt?.toISOString() ?? null,
      fields:          fieldAnalyses,
      recommendations: [...new Set(recommendations)], // dedupe
      alerts,
    };

    ok(res, result);
  } catch (err) {
    next(err);
  }
}

// ─── Field History with Statistics ────────────────────────────
// GET /api/analytics/:projectId/field/:fieldName
// Returns time-series data + statistics for a single field (for charts)
export async function getFieldAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, fieldName } = req.params;
    const limit = Math.min(Number(req.query.limit ?? 100), 500);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        devices: { select: { id: true } },
        telemetryDefs: { where: { fieldName } },
      },
    });

    if (!project) { notFound(res, "Project not found."); return; }

    const def = project.telemetryDefs[0];
    const deviceIds = project.devices.map(d => d.id);

    const rows = deviceIds.length > 0 ? await prisma.telemetryData.findMany({
      where: { deviceId: { in: deviceIds } },
      orderBy: { receivedAt: "asc" },
      take: limit,
      select: { payload: true, receivedAt: true },
    }) : [];

    const series: { t: string; v: number; ma5: number; ma10: number }[] = [];
    const values: number[] = [];

    for (const row of rows) {
      const v = (row.payload as any)?.[fieldName];
      if (typeof v !== "number" || !isFinite(v)) continue;
      values.push(v);
      series.push({
        t:    row.receivedAt.toISOString(),
        v,
        ma5:  Math.round(movingAvg(values, 5) * 100) / 100,
        ma10: Math.round(movingAvg(values, 10) * 100) / 100,
      });
    }

    const avg   = mean(values);
    const sd    = stdDev(values, avg);
    const slope = trendSlope(values);

    ok(res, {
      fieldName,
      label:        def?.label ?? fieldName,
      unit:         def?.unit ?? null,
      thresholdMin: def?.thresholdMin ?? null,
      thresholdMax: def?.thresholdMax ?? null,
      statistics: {
        count: values.length,
        mean:  Math.round(avg * 100) / 100,
        stdDev: Math.round(sd * 100) / 100,
        min:   values.length > 0 ? Math.round(Math.min(...values) * 100) / 100 : null,
        max:   values.length > 0 ? Math.round(Math.max(...values) * 100) / 100 : null,
        slope: Math.round(slope * 1000) / 1000,
        trend: values.length < 5 ? "insufficient_data" :
               Math.abs(slope) / (Math.max(...values) - Math.min(...values) || 1) > 0.02
                 ? (slope > 0 ? "rising" : "falling") : "stable",
      },
      series,
    });
  } catch (err) {
    next(err);
  }
}
