import { QRCodeSVG } from "qrcode.react";
import { X, Download, Printer } from "lucide-react";

interface Props {
  slug: string;
  name: string;
  equipmentId?: string;
  onClose: () => void;
}

export function EquipmentQRCode({ slug, name, equipmentId, onClose }: Props) {
  const url = `${window.location.origin}/hardware/${slug}`;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>QR - ${name}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;}
      .label{margin-top:16px;font-size:14px;font-weight:600;text-align:center;}
      .id{font-size:11px;color:#666;margin-top:4px;}
      @media print{body{margin:0;}}</style></head>
      <body>${document.getElementById("qr-svg-container")?.innerHTML || ""}
      <div class="label">${name}</div>
      ${equipmentId ? `<div class="id">${equipmentId}</div>` : ""}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = () => {
    const svg = document.getElementById("qr-svg-container")?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 512, 512);
      const link = document.createElement("a");
      link.download = `qr-${slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-xs p-6 text-center">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Equipment QR Code</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div id="qr-svg-container" className="bg-white rounded-xl p-4 inline-block mb-3">
          <QRCodeSVG value={url} size={200} level="H" />
        </div>
        <p className="font-semibold text-sm mb-0.5">{name}</p>
        {equipmentId && <p className="text-xs text-muted-foreground mb-4">{equipmentId}</p>}
        <p className="text-[10px] text-muted-foreground mb-4 break-all">{url}</p>
        <div className="flex gap-2">
          <button onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <Download className="h-3.5 w-3.5" />Download
          </button>
          <button onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Printer className="h-3.5 w-3.5" />Print
          </button>
        </div>
      </div>
    </div>
  );
}
