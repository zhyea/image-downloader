(function () {
  if (window.__pageImageDownloadExt) return;
  window.__pageImageDownloadExt = true;

  const PROBE_TIMEOUT_MS = 650;
  const MAX_IMG_ELEMENTS = 1200;
  const IMG_BATCH_SIZE = 64;

  const URL_RE = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

  async function parallelInBatches(items, batchSize, fn) {
    const out = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const slice = items.slice(i, i + batchSize);
      out.push(...(await Promise.all(slice.map((item) => fn(item)))));
    }
    return out;
  }

  function pickFromSrcset(srcset) {
    if (!srcset || !srcset.trim()) return null;
    const candidates = srcset.split(",").map((s) => s.trim());
    let bestUrl = null;
    let bestW = -1;
    let bestX = -1;
    for (const part of candidates) {
      const mw = part.match(/^(\S+)\s+(\d+)w$/);
      if (mw) {
        const w = parseInt(mw[2], 10);
        if (w > bestW) {
          bestW = w;
          bestUrl = mw[1];
        }
        continue;
      }
      const mx = part.match(/^(\S+)\s+([\d.]+)x$/i);
      if (mx) {
        const x = parseFloat(mx[2]);
        if (x > bestX) {
          bestX = x;
          bestUrl = mx[1];
        }
        continue;
      }
      const urlOnly = part.split(/\s+/)[0];
      if (urlOnly && bestUrl === null) bestUrl = urlOnly;
    }
    return bestUrl;
  }

  function bestUrlFromSrcsetOrAttrs(img) {
    const fromSet =
      pickFromSrcset(img.getAttribute("srcset") || "") ||
      pickFromSrcset(img.getAttribute("data-srcset") || "");
    if (fromSet) {
      const u = absolutize(fromSet);
      return u || fromSet;
    }
    const dataSrc = img.getAttribute("data-src");
    if (dataSrc) {
      const u = absolutize(dataSrc);
      return u || dataSrc;
    }
    const plain = img.getAttribute("src");
    if (plain) {
      const u = absolutize(plain);
      return u || plain;
    }
    return null;
  }

  function resolvedImgUrl(img) {
    const cur = img.currentSrc;
    if (cur) {
      const u = absolutize(cur);
      return u || cur;
    }
    return bestUrlFromSrcsetOrAttrs(img);
  }

  function probeImageNaturalSize(url, timeoutMs = PROBE_TIMEOUT_MS) {
    return new Promise((resolve) => {
      if (!url) {
        resolve({ w: 0, h: 0 });
        return;
      }
      const img = new Image();
      const done = (w, h) => {
        clearTimeout(tid);
        img.onload = null;
        img.onerror = null;
        resolve({ w, h });
      };
      const tid = setTimeout(() => done(0, 0), timeoutMs);
      img.onload = () => done(img.naturalWidth || 0, img.naturalHeight || 0);
      img.onerror = () => done(0, 0);
      try {
        img.src = url;
      } catch {
        done(0, 0);
      }
    });
  }

  function parseSvgRootDimensions(svgOpeningTag) {
    const parseAttr = (name) => {
      const m = svgOpeningTag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)`, "i"));
      if (!m) return 0;
      const v = parseFloat(String(m[1]).replace(/px$/i, ""));
      return Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
    };
    let w = parseAttr("width");
    let h = parseAttr("height");
    if (w === 0 || h === 0) {
      const vm = svgOpeningTag.match(/\bviewBox\s*=\s*["']\s*([^"']+)/i);
      if (vm) {
        const parts = vm[1].trim().split(/[\s,]+/);
        if (parts.length >= 4) {
          const vw = parseFloat(parts[2]);
          const vh = parseFloat(parts[3]);
          if (w === 0 && Number.isFinite(vw) && vw > 0) w = Math.round(vw);
          if (h === 0 && Number.isFinite(vh) && vh > 0) h = Math.round(vh);
        }
      }
    }
    return { w, h };
  }

  async function probeImageIntrinsicSize(url, timeoutMs = PROBE_TIMEOUT_MS) {
    const first = await probeImageNaturalSize(url, timeoutMs);
    if (first.w > 0 && first.h > 0) return first;
    if (!url || !/\.svg(\?|#|$)/i.test(url.split("?")[0])) return first;
    try {
      const r = await fetch(url, { credentials: "omit" });
      if (!r.ok) return first;
      const text = await r.text();
      const root = text.match(/<svg\b[^>]*>/i);
      if (!root) return first;
      const parsed = parseSvgRootDimensions(root[0]);
      if (parsed.w > 0 && parsed.h > 0) return parsed;
      if (parsed.w > 0 || parsed.h > 0) {
        return { w: parsed.w || first.w, h: parsed.h || first.h };
      }
    } catch {
      /* ignore */
    }
    return first;
  }

  function dimensionsFromLinkSizes(sizesAttr) {
    if (!sizesAttr || !sizesAttr.trim()) return { w: 0, h: 0 };
    const low = sizesAttr.trim().toLowerCase();
    if (low === "any") return { w: 0, h: 0 };
    const m = low.match(/(\d+)\s*x\s*(\d+)/);
    if (m) {
      const w = parseInt(m[1], 10);
      const h = parseInt(m[2], 10);
      if (w > 0 && h > 0) return { w, h };
    }
    return { w: 0, h: 0 };
  }

  function maxWidthFromSrcset(srcset) {
    if (!srcset || !srcset.trim()) return 0;
    let maxW = 0;
    for (const part of srcset.split(",")) {
      const m = part.trim().match(/^(\S+)\s+(\d+)w$/);
      if (m) maxW = Math.max(maxW, parseInt(m[2], 10));
    }
    return maxW;
  }

  function absolutize(u) {
    if (!u || typeof u !== "string") return null;
    const t = u.trim();
    if (!t || t.startsWith("javascript:") || t.startsWith("vbscript:")) return null;
    try {
      return new URL(t, document.baseURI).href;
    } catch {
      return null;
    }
  }

  function extractBgUrls(cssText) {
    const out = [];
    if (!cssText) return out;
    URL_RE.lastIndex = 0;
    let m;
    while ((m = URL_RE.exec(cssText)) !== null) {
      const href = absolutize(m[1]);
      if (href && !href.startsWith("data:")) out.push(href);
    }
    return out;
  }

  async function getImgDisplaySize(img, probeUrl) {
    if (!(img instanceof HTMLImageElement)) {
      const r = img.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    }

    if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      return { w: img.naturalWidth, h: img.naturalHeight };
    }

    const layoutSize = () => {
      const r = img.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };

    const rEarly = layoutSize();
    if (rEarly.w >= 1 && rEarly.h >= 1) {
      return rEarly;
    }

    const waitLoad = () =>
      new Promise((resolve) => {
        if (img.complete) {
          resolve();
          return;
        }
        const done = () => {
          clearTimeout(tid);
          img.removeEventListener("load", done);
          img.removeEventListener("error", done);
          resolve();
        };
        const tid = setTimeout(done, 72);
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });

    await waitLoad();

    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      return { w: img.naturalWidth, h: img.naturalHeight };
    }

    let w = 0;
    let h = 0;
    const rLate = layoutSize();
    if (rLate.w >= 1 && rLate.h >= 1) {
      w = rLate.w;
      h = rLate.h;
    }

    const attrW = img.getAttribute("width");
    const attrH = img.getAttribute("height");
    if (w === 0 && attrW != null && attrW !== "") {
      const n = parseInt(String(attrW).replace(/px$/i, ""), 10);
      if (!Number.isNaN(n) && n > 0) w = n;
    }
    if (h === 0 && attrH != null && attrH !== "") {
      const n = parseInt(String(attrH).replace(/px$/i, ""), 10);
      if (!Number.isNaN(n) && n > 0) h = n;
    }

    const rawProbe =
      probeUrl ||
      img.currentSrc ||
      bestUrlFromSrcsetOrAttrs(img) ||
      img.getAttribute("src");
    const tryProbe = rawProbe ? absolutize(rawProbe) || rawProbe : null;
    if ((w === 0 || h === 0) && tryProbe) {
      const p = await probeImageIntrinsicSize(tryProbe);
      if (p.w > 0 && p.h > 0) {
        w = p.w;
        h = p.h;
      }
    }

    if (w === 0 || h === 0) {
      const r = layoutSize();
      if (w === 0) w = r.w;
      if (h === 0) h = r.h;
    }

    return { w, h };
  }

  async function collectImages() {
    const seen = new Set();
    const items = [];

    function add(url, source, meta = {}) {
      const href = absolutize(url);
      if (!href || seen.has(href)) return;
      seen.add(href);
      items.push({
        url: href,
        source,
        alt: meta.alt || "",
        width: meta.width ?? 0,
        height: meta.height ?? 0,
      });
    }

    const imgsAll = Array.from(document.querySelectorAll("img"));
    const imgs =
      imgsAll.length > MAX_IMG_ELEMENTS ? imgsAll.slice(0, MAX_IMG_ELEMENTS) : imgsAll;
    const imgEntries = await parallelInBatches(imgs, IMG_BATCH_SIZE, async (img) => {
      const src = resolvedImgUrl(img);
      if (!src) return null;
      const { w, h } = await getImgDisplaySize(img, src);
      return { src, meta: { alt: img.alt || "", width: w, height: h } };
    });

    for (const entry of imgEntries) {
      if (!entry) continue;
      add(entry.src, "img", entry.meta);
    }

    function sameResourceUrl(a, b) {
      if (!a || !b) return false;
      if (a === b) return true;
      try {
        return new URL(a, document.baseURI).href === new URL(b, document.baseURI).href;
      } catch {
        return false;
      }
    }

    await parallelInBatches(
      Array.from(document.querySelectorAll("picture source")),
      IMG_BATCH_SIZE,
      async (srcEl) => {
        const fromSet = pickFromSrcset(srcEl.getAttribute("srcset") || "");
        const s = fromSet || srcEl.getAttribute("src");
        if (!s) return;
        const href = absolutize(s);
        const url = href || s;
        const picture = srcEl.closest("picture");
        const img = picture && picture.querySelector("img");
        const imgListUrl = img ? resolvedImgUrl(img) : null;
        let w = 0;
        let h = 0;
        if (imgListUrl && sameResourceUrl(url, imgListUrl)) {
          const sz = await getImgDisplaySize(img, imgListUrl);
          w = sz.w;
          h = sz.h;
        } else {
          const probed = await probeImageIntrinsicSize(url);
          if (probed.w > 0 && probed.h > 0) {
            w = probed.w;
            h = probed.h;
          } else if (img) {
            const sz = await getImgDisplaySize(img, imgListUrl || url);
            w = sz.w;
            h = sz.h;
          }
        }
        if (w === 0 && h === 0) {
          w = maxWidthFromSrcset(srcEl.getAttribute("srcset") || "");
        }
        add(url, "picture", { width: w, height: h });
      },
    );

    document.querySelectorAll("video[poster]").forEach((v) => {
      const p = v.getAttribute("poster");
      if (p) add(p, "video poster");
    });

    const iconLinks = document.querySelectorAll(
      'link[rel~="icon"], link[rel~="shortcut icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]',
    );
    await parallelInBatches(Array.from(iconLinks), 16, async (link) => {
      if (!link.href) return;
      const href = absolutize(link.href) || link.href;
      const fromSizes = dimensionsFromLinkSizes(link.getAttribute("sizes") || "");
      let w = fromSizes.w;
      let h = fromSizes.h;
      if (w === 0 || h === 0) {
        const probed = await probeImageIntrinsicSize(href);
        if (w === 0 && probed.w > 0) w = probed.w;
        if (h === 0 && probed.h > 0) h = probed.h;
      }
      add(href, "favicon", { width: w, height: h });
    });

    const bgRefs = [];
    const bgHrefQueued = new Set();
    function considerBgUrl(u, source, el) {
      const href = absolutize(u);
      if (!href || seen.has(href) || bgHrefQueued.has(href)) return;
      bgHrefQueued.add(href);
      bgRefs.push({ href, source, el });
    }

    const styleNodes = document.querySelectorAll("[style]");
    styleNodes.forEach((el) => {
      const st = el.getAttribute("style");
      extractBgUrls(st).forEach((u) => considerBgUrl(u, "inline style", el));
    });

    const maxBgScan = 400;
    const all = document.body ? document.body.getElementsByTagName("*") : [];
    const n = Math.min(all.length, maxBgScan);
    for (let i = 0; i < n; i++) {
      const el = all[i];
      let bg;
      try {
        bg = getComputedStyle(el).backgroundImage;
      } catch {
        continue;
      }
      if (!bg || bg === "none") continue;
      extractBgUrls(bg).forEach((u) => considerBgUrl(u, "CSS background", el));
    }

    const bgSized = await parallelInBatches(bgRefs, IMG_BATCH_SIZE, async ({ href, source, el }) => {
      let probed = await probeImageIntrinsicSize(href);
      let w = probed.w;
      let h = probed.h;
      if ((w === 0 || h === 0) && el) {
        const r = el.getBoundingClientRect();
        const rw = Math.round(r.width);
        const rh = Math.round(r.height);
        if (w === 0) w = rw;
        if (h === 0) h = rh;
      }
      return { href, source, w, h };
    });
    for (const { href, source, w, h } of bgSized) {
      add(href, source, { width: w, height: h });
    }

    items.sort((a, b) => {
      const area = (x) => (x.width || 0) * (x.height || 0);
      return area(b) - area(a);
    });

    return items;
  }

  browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "collect") {
      collectImages()
        .then((images) => sendResponse({ ok: true, images }))
        .catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }));
      return true;
    }
    return undefined;
  });
})();
