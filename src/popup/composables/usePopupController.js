import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import browser from "webextension-polyfill";
import {
  getActiveTab,
  ensureContentScript,
  collectFromTab,
  downloadImage,
} from "../../lib/extensionApi.js";
import { t } from "../../lib/i18n.js";
import { loadUserSettings, subscribeToUserSettings } from "../../lib/userSettings.js";

export function usePopupController() {
  const statusText = ref(t("statusScanning"));
  const statusError = ref(false);
  const images = ref([]);
  const listVisible = ref(false);
  const downloadingAll = ref(false);
  const thumbFailed = ref(new Set());
  const selectedKeys = ref(new Set());
  const prevFilteredUrls = ref(new Set());
  const popupWidthPx = ref(456);
  const gridColumns = ref(3);

  const sliderMaxW = ref(4096);
  const sliderMaxH = ref(4096);
  const filterMinW = ref(0);
  const filterMaxW = ref(4096);
  const filterMinH = ref(0);
  const filterMaxH = ref(4096);

  const downloadLabels = ref({});
  const copyLabels = ref({});

  function updateSliderCapsFromList(list) {
    const ws = list.map((i) => i.width || 0).filter((n) => n > 0);
    const hs = list.map((i) => i.height || 0).filter((n) => n > 0);
    const mw = ws.length ? Math.max(...ws) : 0;
    const mh = hs.length ? Math.max(...hs) : 0;
    const capW = Math.min(8192, Math.max(256, mw || 1920));
    const capH = Math.min(8192, Math.max(256, mh || 1920));
    sliderMaxW.value = capW;
    sliderMaxH.value = capH;
    filterMinW.value = 0;
    filterMinH.value = 0;
    filterMaxW.value = capW;
    filterMaxH.value = capH;
  }

  function passesSizeFilter(item) {
    const w = item.width || 0;
    const h = item.height || 0;
    const smW = sliderMaxW.value;
    const smH = sliderMaxH.value;
    const widthNarrowed = filterMinW.value > 0 || filterMaxW.value < smW;
    const heightNarrowed = filterMinH.value > 0 || filterMaxH.value < smH;

    if (widthNarrowed && w === 0) return false;
    if (heightNarrowed && h === 0) return false;

    if (w === 0 && h === 0) return true;
    if (w === 0) return h >= filterMinH.value && h <= filterMaxH.value;
    if (h === 0) return w >= filterMinW.value && w <= filterMaxW.value;
    return (
      w >= filterMinW.value &&
      w <= filterMaxW.value &&
      h >= filterMinH.value &&
      h <= filterMaxH.value
    );
  }

  const filteredImages = computed(() => images.value.filter(passesSizeFilter));

  const selectedCount = computed(
    () => filteredImages.value.filter((item) => selectedKeys.value.has(item.url)).length,
  );

  const allFilteredSelected = computed(() => {
    const list = filteredImages.value;
    if (!list.length) return false;
    return list.every((item) => selectedKeys.value.has(item.url));
  });

  watch([filterMinW, filterMaxW, filterMinH, filterMaxH], () => {
    if (filterMinW.value > filterMaxW.value) filterMaxW.value = filterMinW.value;
    if (filterMaxW.value < filterMinW.value) filterMinW.value = filterMaxW.value;
    if (filterMinH.value > filterMaxH.value) filterMaxH.value = filterMinH.value;
    if (filterMaxH.value < filterMinH.value) filterMinH.value = filterMaxH.value;
  });

  watch(
    filteredImages,
    (list) => {
      const urls = new Set(list.map((i) => i.url));
      const prev = prevFilteredUrls.value;
      const emptyPrev = prev.size === 0;
      const next = new Set();
      for (const item of list) {
        const u = item.url;
        if (emptyPrev || !prev.has(u)) {
          next.add(u);
        } else if (selectedKeys.value.has(u)) {
          next.add(u);
        }
      }
      selectedKeys.value = next;
      prevFilteredUrls.value = urls;
    },
    { deep: true },
  );

  watch(
    [filteredImages, images],
    () => {
      if (!listVisible.value || statusError.value || !images.value.length) return;
      statusText.value = t("statusCount", [
        String(images.value.length),
        String(filteredImages.value.length),
      ]);
    },
    { flush: "post" },
  );

  async function applyUserSettings() {
    const s = await loadUserSettings();
    popupWidthPx.value = s.popupWidthPx;
    gridColumns.value = s.gridColumns;
  }

  function openSettingsPage() {
    browser.runtime.openOptionsPage();
  }

  function thumbOk(item) {
    return !thumbFailed.value.has(item.url);
  }

  function onThumbError(item) {
    const next = new Set(thumbFailed.value);
    next.add(item.url);
    thumbFailed.value = next;
  }

  async function copyImageLink(item) {
    const key = item.url;
    try {
      await navigator.clipboard.writeText(item.url);
      copyLabels.value = { ...copyLabels.value, [key]: t("linkCopied") };
    } catch {
      copyLabels.value = { ...copyLabels.value, [key]: t("copyFailed") };
    }
    setTimeout(() => {
      const next = { ...copyLabels.value };
      delete next[key];
      copyLabels.value = next;
    }, 1500);
  }

  async function runScan() {
    listVisible.value = false;
    statusText.value = t("statusScanning");
    statusError.value = false;
    thumbFailed.value = new Set();
    copyLabels.value = {};
    selectedKeys.value = new Set();
    prevFilteredUrls.value = new Set();

    const tab = await getActiveTab();
    if (!tab?.id) {
      statusText.value = t("errNoTab");
      statusError.value = true;
      images.value = [];
      return;
    }
    const u = tab.url || "";
    if (
      u.startsWith("chrome://") ||
      u.startsWith("edge://") ||
      (u.startsWith("about:") && u !== "about:blank")
    ) {
      statusText.value = t("errRestrictedPage");
      statusError.value = true;
      images.value = [];
      return;
    }

    try {
      await ensureContentScript(tab.id);
    } catch (e) {
      statusText.value = t("errInject", [String(e?.message || e)]);
      statusError.value = true;
      images.value = [];
      return;
    }

    const res = await collectFromTab(tab.id);
    if (!res.ok) {
      statusText.value = res.error || t("errScanFailed");
      statusError.value = true;
      images.value = [];
      return;
    }

    const list = res.images || [];
    images.value = list;
    if (!list.length) {
      statusText.value = t("statusNoImages");
      listVisible.value = false;
      return;
    }
    updateSliderCapsFromList(list);
    statusText.value = t("statusCount", [
      String(list.length),
      String(list.filter(passesSizeFilter).length),
    ]);
    listVisible.value = true;
  }

  function toggleRowSelect(item, checked) {
    const k = item.url;
    const next = new Set(selectedKeys.value);
    if (checked) next.add(k);
    else next.delete(k);
    selectedKeys.value = next;
  }

  function toggleSelectAllFiltered() {
    const list = filteredImages.value;
    if (!list.length) return;
    if (allFilteredSelected.value) {
      selectedKeys.value = new Set();
    } else {
      selectedKeys.value = new Set(list.map((item) => item.url));
    }
  }

  async function onDownloadOne(item, index) {
    const key = item.url;
    downloadLabels.value = { ...downloadLabels.value, [key]: t("ellipsis") };
    const ok = await downloadImage(item, index);
    downloadLabels.value = { ...downloadLabels.value, [key]: ok ? t("queued") : t("failed") };
    setTimeout(() => {
      const next = { ...downloadLabels.value };
      delete next[key];
      downloadLabels.value = next;
    }, 1500);
  }

  async function onDownloadSelected() {
    const list = filteredImages.value.filter((item) => selectedKeys.value.has(item.url));
    if (!list.length) return;
    downloadingAll.value = true;
    for (let i = 0; i < list.length; i++) {
      await downloadImage(list[i], i);
      await new Promise((r) => setTimeout(r, 120));
    }
    downloadingAll.value = false;
  }

  let unsubUserSettings;

  onMounted(async () => {
    await applyUserSettings();
    unsubUserSettings = subscribeToUserSettings(applyUserSettings);
    runScan();
  });

  onUnmounted(() => {
    unsubUserSettings?.();
  });

  return {
    statusText,
    statusError,
    images,
    listVisible,
    downloadingAll,
    popupWidthPx,
    gridColumns,
    sliderMaxW,
    sliderMaxH,
    filterMinW,
    filterMaxW,
    filterMinH,
    filterMaxH,
    filteredImages,
    selectedKeys,
    selectedCount,
    allFilteredSelected,
    downloadLabels,
    copyLabels,
    thumbOk,
    onThumbError,
    copyImageLink,
    runScan,
    toggleRowSelect,
    toggleSelectAllFiltered,
    onDownloadOne,
    onDownloadSelected,
    openSettingsPage,
  };
}
