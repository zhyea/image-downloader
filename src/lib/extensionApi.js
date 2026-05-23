import browser from "webextension-polyfill";
import { joinDownloadPath } from "./downloadPath.js";
import { loadUserSettings } from "./userSettings.js";

export function filenameFromUrl(url, index) {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() || "image";
    const clean = last.split("?")[0];
    if (/\.(jpe?g|png|gif|webp|svg|avif|bmp|ico)$/i.test(clean)) return clean;
    return `image-${index + 1}.jpg`;
  } catch {
    return `image-${index + 1}.jpg`;
  }
}

export async function getActiveTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

export async function ensureContentScript(tabId) {
  await browser.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });
}

export async function collectFromTab(tabId) {
  try {
    const res = await browser.tabs.sendMessage(tabId, { action: "collect" });
    return res ?? { ok: false, error: "No response" };
  } catch (e) {
    const msg = e?.message ?? String(e);
    return { ok: false, error: msg };
  }
}

export async function downloadImage(item, index) {
  const settings = await loadUserSettings();
  const basename = filenameFromUrl(item.url, index);
  const filename = joinDownloadPath(settings.downloadSubfolder, basename);

  if (item.url.startsWith("blob:")) {
    try {
      const blob = await fetch(item.url).then((r) => r.blob());
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      const res = await browser.runtime.sendMessage({
        action: "downloadDataUrl",
        dataUrl,
        filename,
      });
      return res?.ok;
    } catch {
      return false;
    }
  }

  const res = await browser.runtime.sendMessage({
    action: "downloadUrl",
    url: item.url,
    filename,
  });
  return res?.ok;
}
