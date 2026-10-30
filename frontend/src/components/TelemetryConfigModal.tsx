// frontend/src/components/TelemetryConfigModal.tsx
//
// Lets a student/faculty define what each JSON field from their ESP32
// actually means — display label, unit, widget type, and alert thresholds.
// Without this, the dashboard just shows raw field names with no context.

import { useState } from "react";
import { X, Plus, Trash2, Save, Loader2, GripVertical } from "lucide-react";
import { projectsApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FieldDef {
  fieldName: string;
  label: string;
  unit: string;
  dataType: "NUMBER" | "BOOLEAN" | "STRING";
  widgetType: "GAUGE" | "CHART" | "STATUS_CARD" | "LED" | "VALUE";
  thresholdMin: string; // kept as string for controlled input, parsed on save
  thresholdMax: string;
  sortOrder: number;
}

interface Props {
  projectId: string;
  existingDefs: any[];
  onClose: () => void;
  onSaved: () => void;
}

function blankField(sortOrder: number): FieldDef {
  return {
    fieldName: "", label: "", unit: "", dataType: "NUMBER",
    widgetType: "VALUE", thresholdMin: "", thresholdMax: "", sortOrder,
  };
}

export function TelemetryConfigModal({ projectId, existingDefs, onClose, onSaved }: Props) {
  const [fields, setFields] = useState<FieldDef[]>(
    existingDefs.length > 0
      ? existingDefs.map((d, i) => ({
          fieldName: d.fieldName,
          label: d.label,
          unit: d.unit ?? "",
          dataType: d.dataType,
          widgetType: d.widgetType,
          thresholdMin: d.thresholdMin != null ? String(d.thresholdMin) : "",
          thresholdMax: d.thresholdMax != null ? String(d.thresholdMax) : "",
          sortOrder: i,
        }))
      : [blankField(0)]
  );
  const [busy, setBusy] = useState(false);

  const updateField = (i: number, patch: Partial<FieldDef>) => {
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  };

  const addField = () => setFields(prev => [...prev, blankField(prev.length)]);
  const removeField = (i: number) => setFields(prev => prev.filter((_, idx) => idx !== i).map((f, idx) => ({ ...f, sortOrder: idx })));

  const handleSave = async () => {
    // Validate — every field needs at least a fieldName and label
    const valid = fields.filter(f => f.fieldName.trim() && f.label.trim());
    if (valid.length === 0) {
      toast.error("Add at least one sensor field with a name and label.");
      return;
    }
    if (valid.length < fields.length) {
      toast.error("Remove empty rows or fill in the field name and label for all rows.");
      return;
    }

    setBusy(true);
    try {
      const payload = valid.map(f => ({
        fieldName:    f.fieldName.trim(),
        label:        f.label.trim(),
        unit:         f.unit.trim() || undefined,
        dataType:     f.dataType,
        widgetType:   f.widgetType,
        thresholdMin: f.thresholdMin.trim() === "" ? undefined : Number(f.thresholdMin),
        thresholdMax: f.thresholdMax.trim() === "" ? undefined : Number(f.thresholdMax),
        sortOrder:    f.sortOrder,
      }));
      await projectsApi.saveTelemetryDefs(projectId, payload);
      toast.success("Sensor configuration saved.");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save configuration.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="font-display text-lg font-bold">Configure Sensor Fields</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Define what each JSON key from your ESP32 means — units, display type, and alert thresholds.
            </p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 my-4">
          The <span className="font-mono font-semibold">Field Name</span> must exactly match the JSON key your ESP32 sends, e.g. for{" "}
          <span className="font-mono">{"{\"temperature\":32.5}"}</span> the field name is <span className="font-mono font-semibold">temperature</span>.
        </p>

        <div className="space-y-3">
          {fields.map((f, i) => (
            <div key={i} className="border border-border rounded-xl p-3 bg-muted/20">
              <div className="flex items-center gap-2 mb-3">
                <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                <span className="text-xs font-semibold text-muted-foreground">Sensor {i + 1}</span>
                <button onClick={() => removeField(i)}
                  className="ml-auto p-1 rounded text-status-fault hover:bg-status-fault/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Field Name (JSON key) *
                  </label>
                  <input value={f.fieldName} onChange={e => updateField(i, { fieldName: e.target.value })}
                    placeholder="e.g. temperature"
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Display Label *
                  </label>
                  <input value={f.label} onChange={e => updateField(i, { label: e.target.value })}
                    placeholder="e.g. Temperature"
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Data Type</label>
                  <select value={f.dataType} onChange={e => updateField(i, { dataType: e.target.value as any })}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    <option value="NUMBER">Number</option>
                    <option value="BOOLEAN">Boolean (true/false)</option>
                    <option value="STRING">Text</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Widget</label>
                  <select value={f.widgetType} onChange={e => updateField(i, { widgetType: e.target.value as any })}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    <option value="VALUE">Value card + sparkline</option>
                    <option value="CHART">Chart</option>
                    <option value="STATUS_CARD">Status card (on/off)</option>
                    <option value="LED">LED indicator</option>
                    <option value="GAUGE">Gauge</option>
                  </select>
                </div>

                {f.dataType === "NUMBER" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Unit</label>
                      <input value={f.unit} onChange={e => updateField(i, { unit: e.target.value })}
                        placeholder="°C, ppm, %"
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Min (alert below)</label>
                        <input type="number" value={f.thresholdMin} onChange={e => updateField(i, { thresholdMin: e.target.value })}
                          placeholder="—"
                          className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Max (alert above)</label>
                        <input type="number" value={f.thresholdMax} onChange={e => updateField(i, { thresholdMax: e.target.value })}
                          placeholder="—"
                          className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <button onClick={addField}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mt-3">
          <Plus className="h-4 w-4" /> Add another sensor field
        </button>

        <div className="flex gap-2 mt-6 pt-4 border-t border-border">
          <button onClick={onClose}
            className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={busy}
            className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <><Save className="h-4 w-4" />Save Configuration</>}
          </button>
        </div>
      </div>
    </div>
  );
}
