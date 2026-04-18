export const PHOTO_TARGETS = {
  maxDimensionPx: 1600,
  maxSizeKb: 500,
  jpegQuality: 0.8,
} as const;

export function photoStoragePath(userId: string, extension = 'jpg'): string {
  const uuid = crypto.randomUUID();
  return `hotspots/${userId}/${uuid}.${extension}`;
}
