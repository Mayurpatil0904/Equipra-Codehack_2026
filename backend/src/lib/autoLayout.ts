// src/lib/autoLayout.ts
//
// Auto-select a sensible dashboard layout as telemetry arrives.
// Whenever an ESP32 sends a field we haven't seen before for this
// project, we infer its data type from the JSON value itself and
// pick a matching widget + a readable label + a likely unit — so
// students get a working dashboard without touching the config
// modal. Anything a student manually configures later (via
// TelemetryConfigModal) simply overwrites these guesses.

import type { TelemetryDataType, WidgetType } from "@prisma/client";

export interface InferredField {
  fieldName:   string;
  label:       string;
  unit:        string | null;
  dataType:    TelemetryDataType;
  widgetType:  WidgetType;
}

// fieldName keyword → likely unit + "gauge-like" bounded reading.
// Order matters — first match wins.
const UNIT_HINTS: { test: RegExp; unit: string }[] = [
  { test: /temp/i,                         unit: "°C" },
  { test: /humid/i,                        unit: "%" },
  { test: /gas|smoke|co2|ppm/i,            unit: "ppm" },
  { test: /batt/i,                         unit: "%" },
  { test: /volt/i,                         unit: "V" },
  { test: /current|amp/i,                  unit: "A" },
  { test: /pressure/i,                     unit: "hPa" },
  { test: /distance|range|depth/i,         unit: "cm" },
  { test: /speed|velocity/i,               unit: "km/h" },
  { test: /rssi|signal/i,                  unit: "dBm" },
  { test: /light|lux|brightness/i,         unit: "lux" },
  { test: /percent|level|charge/i,         unit: "%" },
];

// Fields whose values are naturally continuous/time-varying read
// better as a line chart than a single gauge number.
const CHART_HINTS = /temp|distance|speed|velocity|pressure|altitude|light|lux/i;

function toLabel(fieldName: string): string {
  const spaced = fieldName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!spaced) return fieldName;
  return spaced
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function inferUnit(fieldName: string): string | null {
  const hit = UNIT_HINTS.find(h => h.test.test(fieldName));
  return hit?.unit ?? null;
}

export function inferField(fieldName: string, value: unknown): InferredField {
  const label = toLabel(fieldName);

  if (typeof value === "boolean") {
    return { fieldName, label, unit: null, dataType: "BOOLEAN", widgetType: "STATUS_CARD" };
  }

  if (typeof value === "number") {
    const unit = inferUnit(fieldName);
    const widgetType: WidgetType = CHART_HINTS.test(fieldName) ? "CHART" : "GAUGE";
    return { fieldName, label, unit, dataType: "NUMBER", widgetType };
  }

  // Strings and anything else — shown as a plain value card
  return { fieldName, label, unit: null, dataType: "STRING", widgetType: "VALUE" };
}
