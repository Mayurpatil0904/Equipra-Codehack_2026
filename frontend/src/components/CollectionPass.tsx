import { useState, useEffect } from "react";
import {
  CheckCircle2,
  MapPin,
  Calendar,
  Clock,
  User,
  Package,
  Hash,
  ChevronDown,
  ChevronUp,
  Printer,
  QrCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import QRCode from "qrcode";
import { getEquipmentIcon } from "@/lib/equipmentIcons";

interface Props {
  request: any;
}

function Detail({
  icon: Icon,
  label,
  value,
  highlight,
  full,
}: {
  icon: any;
  label: string;
  value: string;
  highlight?: boolean;
  full?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", full && "col-span-2")}>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
        <Icon className="h-3 w-3" />
        {label}
      </div>

      <p
        className={cn(
          "text-sm font-medium",
          highlight
            ? "text-primary font-bold"
            : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function CollectionPass({ request }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // ✅ Generate the QR code image client-side from the request's qrToken.
  // The QR encodes a URL like https://<frontend-origin>/scan/<token>,
  // which the admin's scanner page resolves via GET /api/requests/scan/:token.
  useEffect(() => {
    if (!request?.qrToken) {
      setQrDataUrl(null);
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const scanUrl = `${origin}/scan/${request.qrToken}`;
    QRCode.toDataURL(scanUrl, {
      width: 240,
      margin: 1,
      color: { dark: "#0F1629", light: "#FFFFFF" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [request?.qrToken]);

  if (!request) return null;

  if (request.status !== "approved") return null;

  const equipment = request.equipment ?? {};
  const EquipmentIcon = getEquipmentIcon(equipment.category);
  const student = request.student ?? {};
  const faculty = request.faculty ?? {};
  const messages = request.messages ?? [];

  const labMessage = [...messages]
    .reverse()
    .find((m: any) => m.sender === "lab");

  const fromDate = request.dateFrom
    ? new Date(request.dateFrom).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  const toDate = request.dateTo
    ? new Date(request.dateTo).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  // Unique id so each pass can be printed in isolation, even when
  // multiple CollectionPass instances exist on /my-requests at once.
  const printId = `collection-pass-${request.id}`;

  const handlePrint = () => {
    const node = document.getElementById(printId);
    if (!node) { window.print(); return; }

    const printWindow = window.open("", "_blank", "width=480,height=720");
    if (!printWindow) { window.print(); return; }

    printWindow.document.write(`
      <html>
        <head>
          <title>Equipra Collection Pass — ${request.requestCode ?? ""}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 24px;
              background: #fff;
              color: #0F1629;
            }
            img { display: block; margin: 0 auto; }
          </style>
        </head>
        <body>${node.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    // give the QR <img> a moment to render before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
  };

  return (
    <div className="mt-4 rounded-xl border-2 border-status-available/40 bg-status-available/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-status-available flex-shrink-0" />

          <div>
            <p className="text-sm font-bold text-status-available">
              Collection Pass Ready
            </p>

            <p className="text-xs text-muted-foreground mt-0.5">
              Show this at the lab counter to collect your equipment
            </p>
          </div>
        </div>

        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-status-available/20">
          <div id={printId} className="mx-4 my-4 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-primary px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-primary-foreground/70 uppercase tracking-widest">
                  Equipra · Collection Pass
                </p>

                <p className="text-white font-bold text-lg mt-0.5">
                  Equipment Approved ✓
                </p>
              </div>

              <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <EquipmentIcon className="h-7 w-7 text-white" />
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  Request Code
                </div>

                <span className="font-mono font-bold text-lg text-foreground tracking-wider">
                  {request.requestCode ?? "N/A"}
                </span>
              </div>

              {/* ✅ QR Code — admin scans this to pull up the request
                  and mark it returned at the lab counter */}
              {qrDataUrl && (
                <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-border">
                  <img src={qrDataUrl} alt="Collection pass QR code" className="w-40 h-40" />
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                    <QrCode className="h-3 w-3" />
                    Lab admin scans this to check you in / process your return
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Detail
                  icon={Package}
                  label="Equipment"
                  value={equipment.name ?? "Equipment"}
                />

                {/* ✅ Show human-readable equipment ID if present */}
                {equipment.equipmentId && (
                  <Detail
                    icon={Hash}
                    label="Equipment ID"
                    value={equipment.equipmentId}
                  />
                )}

                <Detail
                  icon={MapPin}
                  label="Lab Location"
                  value={equipment.labLocation ?? "Lab"}
                  highlight
                />

                <Detail
                  icon={Calendar}
                  label="From"
                  value={fromDate}
                />

                <Detail
                  icon={Calendar}
                  label="Return By"
                  value={toDate}
                  highlight
                />

                <Detail
                  icon={User}
                  label="Student"
                  value={
                    student.name
                      ? `${student.name} · ${student.enrollmentId ?? ""}`
                      : "Student"
                  }
                />

                <Detail
                  icon={User}
                  label="Verified By"
                  value={faculty.name ?? "Faculty"}
                />
              </div>

              <Detail
                icon={Package}
                label="Project"
                value={request.project ?? "N/A"}
                full
              />

              {labMessage ? (
                <div className="p-3.5 bg-primary/8 border border-primary/20 rounded-xl">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Collection Instructions from Lab Admin
                  </p>

                  <p className="text-sm text-foreground font-medium leading-relaxed">
                    {labMessage.text}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-muted/50 rounded-xl text-xs text-muted-foreground">
                  No collection instructions available.
                </div>
              )}

              <p className="text-[10px] text-muted-foreground text-center border-t border-border/50 pt-3">
                Present this pass at the lab counter.
                Equipment must be returned by {toDate}.
              </p>
            </div>
          </div>

          <div className="px-4 pb-4">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
