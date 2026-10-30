// frontend/src/components/BulkUploadUsersModal.tsx
//
// Lets an admin onboard students & faculty in bulk via Excel/CSV,
// instead of filling the single-user form dozens of times.
// Mirrors the existing BulkUploadEquipmentModal pattern.

import { useState, useRef } from "react";
import { X, Download, Upload, Loader2, CheckCircle2, AlertTriangle, FileSpreadsheet, Users } from "lucide-react";
import { adminApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  onDone: () => void; // refresh user list
}

type Result = { message: string; added: any[]; skipped: { row: number; name?: string; reason: string }[] };

export function BulkUploadUsersModal({ onClose, onDone }: Props) {
  const [file, setFile]       = useState<File | null>(null);
  const [busy, setBusy]       = useState(false);
  const [result, setResult]   = useState<Result | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      await adminApi.downloadUserTemplate();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to download template.");
    }
  };

  const handleFile = (f: File | null) => {
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
      toast.error("Please choose an .xlsx, .xls, or .csv file.");
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await adminApi.bulkUploadUsers(file);
      setResult(res);
      if (res.added.length > 0) {
        toast.success(`${res.added.length} user(s) added successfully.`);
        onDone();
      }
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg p-6 animate-fade-in my-4 max-h-[90vh] overflow-y-auto">

        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Bulk Upload Users
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add students & faculty in bulk via Excel or CSV.
            </p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        {/* Step 1 — template */}
        <div className="bg-muted/50 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-foreground mb-1">1. Download the template</p>
          <p className="text-xs text-muted-foreground mb-3">
            Includes columns: enrollmentId, name, email, password, role (STUDENT/FACULTY), department, semester — with example rows.
          </p>
          <button onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
            <Download className="h-3.5 w-3.5" /> Download .xlsx Template
          </button>
        </div>

        {/* Step 2 — upload */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-foreground mb-2">2. Upload your filled-in file</p>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            )}
          >
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={e => handleFile(e.target.files?.[0] ?? null)} />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <span className="font-medium">{file.name}</span>
              </div>
            ) : (
              <>
                <Upload className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop, or <span className="text-primary font-medium">click to browse</span>
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">.xlsx, .xls, or .csv</p>
              </>
            )}
          </div>
        </div>

        <button onClick={handleUpload} disabled={!file || busy}
          className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 mb-4">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</> : <><Upload className="h-4 w-4" />Upload & Add Users</>}
        </button>

        {/* Results */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-status-available/10 border border-status-available/25">
              <CheckCircle2 className="h-4 w-4 text-status-available flex-shrink-0" />
              <p className="text-sm text-status-available font-medium">{result.message}</p>
            </div>

            {result.added.length > 0 && (
              <div className="text-xs">
                <p className="font-semibold text-foreground mb-1.5">Added ({result.added.length}):</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.added.map((a, i) => (
                    <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded bg-muted/50">
                      <span className="text-foreground">{a.name}</span>
                      <span className="font-mono text-muted-foreground">{a.enrollmentId} · {a.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.skipped.length > 0 && (
              <div className="text-xs">
                <p className="font-semibold text-status-fault mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Skipped ({result.skipped.length}):
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.skipped.map((s, i) => (
                    <div key={i} className="px-2.5 py-1.5 rounded bg-status-fault/8">
                      <span className="text-foreground font-medium">Row {s.row}{s.name ? ` (${s.name})` : ""}: </span>
                      <span className="text-muted-foreground">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
