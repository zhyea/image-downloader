import browser from "webextension-polyfill";
import { joinDownloadPath, toDownloadsRelativePath } from "../lib/downloadPath.js";
import {
  registerPendingFilename,
  consumePendingFilenameForItem,
} from "../lib/downloadRegistry.js";
import { loadUserSettings } from "../lib/userSettings.js";

const chromeDownloads = globalThis.chrome?.downloads;

if (chromeDownloads?.onDeterminingFilename) {
  chromeDownloads.onDeterminingFilename.addListener((item, suggest) => {
    if (item.byExtensionId !== browser.runtime.id) {
      suggest();
      return;
    }
    const custom = consumePendingFilenameForItem(item);
    if (custom) {
      suggest({ filename: custom, conflictAction: "uniquify" });
      return;
    }
    suggest();
  });
}

async function resolveFilename(message) {
  if (message.filename) {
    return toDownloadsRelativePath(message.filename);
  }
  const settings = await loadUserSettings();
  return joinDownloadPath(settings.downloadSubfolder, message.basename || "image.jpg");
}

async function startDownload(url, filename) {
  const path = await resolveFilename({ filename });
  registerPendingFilename(url, path);
  return browser.downloads.download({ url, filename: path, saveAs: false });
}

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { action } = message;
  if (action !== "downloadUrl" && action !== "downloadDataUrl") return undefined;
  const url = action === "downloadDataUrl" ? message.dataUrl : message.url;

  startDownload(url, message.filename)
    .then((id) => sendResponse({ ok: true, id }))
    .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));

  return true;
});
