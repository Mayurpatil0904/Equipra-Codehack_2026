import crypto from "crypto";

export function generateQrToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function buildQrUrl(qrToken: string): string {
  const base = process.env.CLIENT_URL || "http://localhost:5173";
  return `${base}/scan/${qrToken}`;
}
