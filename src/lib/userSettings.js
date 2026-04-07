import browser from "webextension-polyfill";

export const STORAGE_KEY = "imageDownloaderSettings";

export const DEFAULT_SETTINGS = {
  popupWidthPx: 456,
  gridColumns: 3,
};

const LIMITS = {
  popupWidthPx: { min: 320, max: 800 },
  gridColumns: { min: 1, max: 6 },
};

function clampInt(v, min, max, fallback) {
  const n = parseInt(String(v), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function loadUserSettings() {
  try {
    const { [STORAGE_KEY]: raw } = await browser.storage.local.get(STORAGE_KEY);
    if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
    return {
      popupWidthPx: clampInt(
        raw.popupWidthPx,
        LIMITS.popupWidthPx.min,
        LIMITS.popupWidthPx.max,
        DEFAULT_SETTINGS.popupWidthPx,
      ),
      gridColumns: clampInt(
        raw.gridColumns,
        LIMITS.gridColumns.min,
        LIMITS.gridColumns.max,
        DEFAULT_SETTINGS.gridColumns,
      ),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveUserSettings(partial) {
  const cur = await loadUserSettings();
  const next = {
    popupWidthPx: clampInt(
      partial.popupWidthPx ?? cur.popupWidthPx,
      LIMITS.popupWidthPx.min,
      LIMITS.popupWidthPx.max,
      DEFAULT_SETTINGS.popupWidthPx,
    ),
    gridColumns: clampInt(
      partial.gridColumns ?? cur.gridColumns,
      LIMITS.gridColumns.min,
      LIMITS.gridColumns.max,
      DEFAULT_SETTINGS.gridColumns,
    ),
  };
  await browser.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export function subscribeToUserSettings(callback) {
  const listener = (changes, area) => {
    if (area !== "local" || !changes[STORAGE_KEY]) return;
    callback();
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
