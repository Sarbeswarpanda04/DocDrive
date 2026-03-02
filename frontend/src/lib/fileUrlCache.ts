/**
 * Module-level cache for signed download URLs.
 * Shared between FileCard and FilePreviewModal to avoid duplicate requests.
 */
const cache = new Map<string, { url: string; expiresAt: number }>();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export function getCachedUrl(fileId: string): string | null {
  const entry = cache.get(fileId);
  if (entry && entry.expiresAt > Date.now()) return entry.url;
  return null;
}

export function setCachedUrl(fileId: string, url: string): void {
  cache.set(fileId, { url, expiresAt: Date.now() + TTL_MS });
}
