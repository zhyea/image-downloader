/** Pending relative paths keyed by download URL (for onDeterminingFilename). */
const pendingByUrl = new Map();

const TTL_MS = 5 * 60 * 1000;

export function registerPendingFilename(url, filename) {
  if (!url || !filename) return;
  pendingByUrl.set(url, filename);
  setTimeout(() => pendingByUrl.delete(url), TTL_MS);
}

export function consumePendingFilename(url) {
  if (!url) return undefined;
  const filename = pendingByUrl.get(url);
  if (filename) pendingByUrl.delete(url);
  return filename;
}

export function consumePendingFilenameForItem(item) {
  return (
    consumePendingFilename(item.url) ||
    consumePendingFilename(item.finalUrl) ||
    consumePendingFilename(item.referrer)
  );
}
