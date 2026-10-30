/**
 * Generates a data URL of white text on a black canvas.
 * Used as the source image for InteractiveParticles so we
 * don't need an external image file.
 */
export function generateTextImage(
  text: string,
  options?: {
    fontSize?: number;
    fontFamily?: string;
    width?: number;
    height?: number;
    paddingX?: number;
  }
): string {
  const {
    fontSize = 72,
    fontFamily = "'Inter', 'Segoe UI', sans-serif",
    width = 800,
    height = 200,
    paddingX = 40,
  } = options ?? {};

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Black background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // White text, centered
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2, width - paddingX * 2);

  return canvas.toDataURL("image/png");
}
