// src/lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a base64 image to Cloudinary.
 * Returns the secure URL of the uploaded image.
 */
export async function uploadImage(base64Data: string): Promise<string> {
  // Ensure it has the data URI prefix
  const data = base64Data.startsWith("data:")
    ? base64Data
    : `data:image/jpeg;base64,${base64Data}`;

  const result = await cloudinary.uploader.upload(data, {
    folder: "equipra/equipment",
    transformation: [
      { width: 800, crop: "limit" },
      { quality: "auto", fetch_format: "auto" },
    ],
  });

  return result.secure_url;
}

/**
 * Delete an image from Cloudinary by its URL.
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Extract public_id from URL: .../equipra/equipment/abc123.jpg -> equipra/equipment/abc123
    const parts = imageUrl.split("/");
    const uploadIdx = parts.indexOf("upload");
    if (uploadIdx === -1) return;
    const publicIdParts = parts.slice(uploadIdx + 2); // skip version number
    const publicId = publicIdParts.join("/").replace(/\.[^.]+$/, ""); // remove extension
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("[CLOUDINARY] Failed to delete image:", err);
  }
}

export function isConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}
