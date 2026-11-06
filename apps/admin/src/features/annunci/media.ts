/** Storage descriptors are not browser URLs. Never resolve a path against the Admin origin. */
export function isAnnouncementImagePath(value: string, mimeType: string | null): boolean {
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : null;
  if (!extension || value.length !== 139 + extension.length) return false;
  return new RegExp(`^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/[0-9a-f]{64}\\.${extension}$`).test(value);
}
