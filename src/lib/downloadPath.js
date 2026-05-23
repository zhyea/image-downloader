const INVALID_SEGMENT = /[<>:"|?*\x00-\x1f]/g;

/** Normalize user subfolder under the browser download directory. */
export function sanitizeDownloadSubfolder(raw) {
  if (raw == null) return "";
  const s = String(raw).trim().replace(/\\/g, "/");
  if (!s) return "";
  const parts = s
    .split("/")
    .map((p) => p.trim())
    .filter((p) => p && p !== "." && p !== "..")
    .map((p) => p.replace(INVALID_SEGMENT, "_"))
    .filter(Boolean);
  return parts.join("/").slice(0, 200);
}

export function joinDownloadPath(subfolder, filename) {
  const sub = sanitizeDownloadSubfolder(subfolder);
  const base =
    String(filename || "image.jpg")
      .replace(/\\/g, "/")
      .split("/")
      .pop() || "image.jpg";
  const joined = sub ? `${sub}/${base}` : base;
  return toDownloadsRelativePath(joined);
}

/** Chrome on Windows prefers backslashes in download relative paths. */
export function toDownloadsRelativePath(relativePath) {
  const s = String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  if (!s) return "";
  const isWin =
    typeof navigator !== "undefined" && /win/i.test(navigator.userAgent || "");
  return isWin ? s.replace(/\//g, "\\") : s;
}
