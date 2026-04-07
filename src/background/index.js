import browser from "webextension-polyfill";

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { action } = message;
  if (action !== "downloadUrl" && action !== "downloadDataUrl") return undefined;
  const url = action === "downloadDataUrl" ? message.dataUrl : message.url;
  const { filename } = message;
  browser.downloads
    .download({ url, filename, saveAs: false })
    .then((id) => sendResponse({ ok: true, id }))
    .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
  return true;
});
