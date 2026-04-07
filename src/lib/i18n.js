import browser from "webextension-polyfill";

/**
 * @param {string} key
 * @param {string[] | Record<string, string>} [substitutions]
 */
export function t(key, substitutions) {
  const msg = browser.i18n.getMessage(key, substitutions);
  return msg || key;
}

export function applyDocumentLocale() {
  try {
    document.documentElement.lang = browser.i18n.getUILanguage();
    const dir = browser.i18n.getMessage("@@bidi_dir");
    if (dir === "rtl" || dir === "ltr") {
      document.documentElement.dir = dir;
    }
  } catch {
    /* ignore */
  }
}
