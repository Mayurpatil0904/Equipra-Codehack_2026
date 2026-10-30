// src/lib/deviceKey.ts
//
// Device API keys are hashed (for auth) AND reversibly encrypted (for the
// "View Key" feature) — never stored in plaintext.
//
//   apiKeyHash      → used to authenticate incoming telemetry (one-way)
//   apiKeyEncrypted → decrypted on demand when a user clicks "View Key"
//
// The encryption secret comes from DEVICE_KEY_SECRET. If that's not set we
// derive one from JWT_SECRET so this still works out of the box — but for
// production you should set a dedicated DEVICE_KEY_SECRET in your .env.

import crypto from "crypto";

const RAW_SECRET = process.env.DEVICE_KEY_SECRET ?? process.env.JWT_SECRET ?? "equipra_fallback_dev_secret";
const ENC_KEY = crypto.createHash("sha256").update(RAW_SECRET).digest(); // 32 bytes for AES-256

export interface GeneratedKey {
  plaintext: string; // return this to the client ONCE at creation/regenerate
  hash: string;        // store this — used to authenticate telemetry
  encrypted: string;   // store this — decryptable later via "View Key"
  prefix: string;      // store this — safe to display without decrypting
}

export function generateDeviceKey(): GeneratedKey {
  const raw = crypto.randomBytes(24).toString("hex");
  const plaintext = `ek_${raw}`;
  return {
    plaintext,
    hash: hashDeviceKey(plaintext),
    encrypted: encryptDeviceKey(plaintext),
    prefix: plaintext.slice(0, 10) + "…", // "ek_a1b2c3d4…"
  };
}

export function hashDeviceKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext.trim()).digest("hex");
}

export function encryptDeviceKey(plaintext: string): string {
  const iv = crypto.randomBytes(12); // 96-bit IV, standard for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Pack iv + authTag + ciphertext into one base64 blob
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptDeviceKey(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
