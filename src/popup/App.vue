<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import browser from "webextension-polyfill";
import {
  getActiveTab,
  ensureContentScript,
  collectFromTab,
  downloadImage,
} from "../lib/extensionApi.js";
import { t } from "../lib/i18n.js";
import { loadUserSettings, subscribeToUserSettings } from "../lib/userSettings.js";

const SOURCE_I18N = {
  img: "sourceImg",
  picture: "sourcePicture",
  "video poster": "sourceVideoPoster",
  favicon: "sourceFavicon",
  "inline style": "sourceInlineStyle",
  "CSS background": "sourceCssBackground",
};

function sourceLabel(source) {
  const key = SOURCE_I18N[source];
  return key ? t(key) : t("sourceUnknown");
}

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

async function applyUserSettings() {
  const s = await loadUserSettings();
  popupWidthPx.value = s.popupWidthPx;
  gridColumns.value = s.gridColumns;
}

function openSettingsPage() {
  browser.runtime.openOptionsPage();
}

const sliderMaxW = ref(4096);
const sliderMaxH = ref(4096);
const filterMinW = ref(0);
const filterMaxW = ref(4096);
const filterMinH = ref(0);
const filterMaxH = ref(4096);

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

const widthFillStyle = computed(() => {
  const max = sliderMaxW.value || 1;
  const left = (filterMinW.value / max) * 100;
  const w = Math.max(0, ((filterMaxW.value - filterMinW.value) / max) * 100);
  return { left: `${left}%`, width: `${w}%` };
});

const heightFillStyle = computed(() => {
  const max = sliderMaxH.value || 1;
  const left = (filterMinH.value / max) * 100;
  const w = Math.max(0, ((filterMaxH.value - filterMinH.value) / max) * 100);
  return { left: `${left}%`, width: `${w}%` };
});

watch([filterMinW, filterMaxW, filterMinH, filterMaxH], () => {
  if (filterMinW.value > filterMaxW.value) filterMaxW.value = filterMinW.value;
  if (filterMaxW.value < filterMinW.value) filterMinW.value = filterMaxW.value;
  if (filterMinH.value > filterMaxH.value) filterMaxH.value = filterMinH.value;
  if (filterMaxH.value < filterMinH.value) filterMinH.value = filterMaxH.value;
});

function onThumbError(item) {
  const next = new Set(thumbFailed.value);
  next.add(item.url);
  thumbFailed.value = next;
}

function thumbOk(item) {
  return !thumbFailed.value.has(item.url);
}

const downloadLabels = ref({});
const copyLabels = ref({});

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

const selectedCount = computed(
  () => filteredImages.value.filter((item) => selectedKeys.value.has(item.url)).length,
);

const allFilteredSelected = computed(() => {
  const list = filteredImages.value;
  if (!list.length) return false;
  return list.every((item) => selectedKeys.value.has(item.url));
});

function toggleSelectAllFiltered() {
  const list = filteredImages.value;
  if (!list.length) return;
  if (allFilteredSelected.value) {
    selectedKeys.value = new Set();
  } else {
    selectedKeys.value = new Set(list.map((item) => item.url));
  }
}

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

watch(
  [filteredImages, images],
  () => {
    if (!listVisible.value || statusError.value || !images.value.length) return;
    const n = images.value.length;
    const m = filteredImages.value.length;
    statusText.value = t("statusCount", [String(n), String(m)]);
  },
  { flush: "post" },
);

function itemDim(item) {
  return item.width && item.height ? `${item.width}×${item.height}` : t("dimUnknown");
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
</script>

<template>
  <div class="popup-root" :style="{ width: `${popupWidthPx}px` }">
    <header class="bar">
      <h1>{{ t("headerTitle") }}</h1>
      <div class="actions">
        <button type="button" :title="t('tooltipRefresh')" @click="runScan">
          {{ t("refresh") }}
        </button>
        <button
          type="button"
          :title="allFilteredSelected ? t('tooltipDeselectAll') : t('tooltipSelectAll')"
          :disabled="!listVisible || !filteredImages.length"
          @click="toggleSelectAllFiltered"
        >
          {{ allFilteredSelected ? t("deselectAll") : t("selectAll") }}
        </button>
        <button
          type="button"
          :title="t('tooltipDownloadSelected')"
          :disabled="downloadingAll || !selectedCount"
          @click="onDownloadSelected"
        >
          {{ t("downloadSelected") }}
        </button>
        <button
          type="button"
          class="btn-settings"
          :title="t('tooltipSettings')"
          :aria-label="t('tooltipSettings')"
          @click="openSettingsPage"
        >
          <svg
            class="btn-settings-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </header>
    <p class="status" :class="{ error: statusError }">{{ statusText }}</p>
    <div v-show="listVisible && images.length" class="filters">
      <div class="filter-row">
        <span class="filter-heading">{{
          t("filterWidth", [String(filterMinW), String(filterMaxW), String(sliderMaxW)])
        }}</span>
        <div class="dual-range" role="group" :aria-label="t('ariaWidthRange')">
          <div class="dual-range-track" aria-hidden="true">
            <div class="dual-range-fill" :style="widthFillStyle" />
          </div>
          <input
            v-model.number="filterMinW"
            class="dual-range-input dual-range-min"
            type="range"
            min="0"
            :max="sliderMaxW"
            step="1"
            :title="t('titleMinWidth')"
            :aria-label="t('titleMinWidth')"
          />
          <input
            v-model.number="filterMaxW"
            class="dual-range-input dual-range-max"
            type="range"
            min="0"
            :max="sliderMaxW"
            step="1"
            :title="t('titleMaxWidth')"
            :aria-label="t('titleMaxWidth')"
          />
        </div>
      </div>
      <div class="filter-row">
        <span class="filter-heading">{{
          t("filterHeight", [String(filterMinH), String(filterMaxH), String(sliderMaxH)])
        }}</span>
        <div class="dual-range" role="group" :aria-label="t('ariaHeightRange')">
          <div class="dual-range-track" aria-hidden="true">
            <div class="dual-range-fill" :style="heightFillStyle" />
          </div>
          <input
            v-model.number="filterMinH"
            class="dual-range-input dual-range-min"
            type="range"
            min="0"
            :max="sliderMaxH"
            step="1"
            :title="t('titleMinHeight')"
            :aria-label="t('titleMinHeight')"
          />
          <input
            v-model.number="filterMaxH"
            class="dual-range-input dual-range-max"
            type="range"
            min="0"
            :max="sliderMaxH"
            step="1"
            :title="t('titleMaxHeight')"
            :aria-label="t('titleMaxHeight')"
          />
        </div>
      </div>
      <p class="filter-hint">
        {{ t("filterHint") }}
      </p>
    </div>
    <div
      v-show="listVisible"
      class="grid"
      :style="{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }"
    >
      <div
        v-for="(item, index) in filteredImages"
        :key="item.url"
        class="grid-item"
      >
        <div class="grid-thumb">
          <input
            type="checkbox"
            class="thumb-select"
            :checked="selectedKeys.has(item.url)"
            :aria-label="t('selectForDownload')"
            :title="t('selectForDownload')"
            @click.stop
            @change="toggleRowSelect(item, $event.target.checked)"
          />
          <template v-if="thumbOk(item)">
            <img
              alt=""
              referrerpolicy="no-referrer"
              loading="lazy"
              :src="item.url"
              @error="onThumbError(item)"
            />
          </template>
          <span v-else class="thumb-fallback">—</span>
        </div>
        <div class="grid-meta">
          <span class="tag">{{ sourceLabel(item.source) }} · {{ itemDim(item) }}</span>
        </div>
        <div class="grid-actions">
          <button
            type="button"
            class="btn-copy"
            :title="t('tooltipCopyLink')"
            @click="copyImageLink(item)"
          >
            {{ copyLabels[item.url] || t("copyLink") }}
          </button>
          <button
            type="button"
            class="primary btn-dl"
            @click="onDownloadOne(item, index)"
          >
            {{ downloadLabels[item.url] || t("download") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.popup-root {
  max-height: 620px;
  box-sizing: border-box;
  font-family:
    system-ui,
    -apple-system,
    "Segoe UI",
    Roboto,
    "Helvetica Neue",
    Arial,
    sans-serif;
  font-size: 13px;
  color: #1a1a1a;
  background: #f6f7f9;
}

:global(body) {
  margin: 0;
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid #e4e6eb;
}

.bar h1 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 6px;
}

.btn-settings {
  padding: 5px 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #374151;
}

.btn-settings:hover:not(:disabled) {
  color: #1d4ed8;
}

.btn-settings-icon {
  width: 18px;
  height: 18px;
  display: block;
  flex-shrink: 0;
}

button {
  font: inherit;
  cursor: pointer;
  border: 1px solid #c9ced6;
  background: #fff;
  border-radius: 6px;
  padding: 5px 10px;
}

button:hover:not(:disabled) {
  background: #f0f2f5;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button.primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

button.primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.status {
  margin: 10px 12px;
  color: #5c6370;
}

.status.error {
  color: #b91c1c;
}

.filters {
  margin: 0 10px 8px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #e4e6eb;
  border-radius: 8px;
}

.filter-row {
  margin-bottom: 8px;
}

.filter-row:last-of-type {
  margin-bottom: 4px;
}

.filter-heading {
  display: block;
  font-size: 11px;
  color: #374151;
  font-weight: 500;
  margin-bottom: 4px;
}

.dual-range {
  position: relative;
  height: 28px;
  margin: 2px 0 0;
}

.dual-range-track {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  pointer-events: none;
}

.dual-range-fill {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 3px;
  background: #93c5fd;
  pointer-events: none;
}

.dual-range-input {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  width: 100%;
  height: 28px;
  margin: 0;
  padding: 0;
  background: none;
  pointer-events: none;
  -webkit-appearance: none;
  appearance: none;
}

.dual-range-input::-webkit-slider-runnable-track {
  height: 6px;
  background: transparent;
}

.dual-range-input.dual-range-min::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  margin-top: -4px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: #93c5fd;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  cursor: grab;
  pointer-events: auto;
}

.dual-range-input.dual-range-max::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  margin-top: -4px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: #1d4ed8;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  cursor: grab;
  pointer-events: auto;
}

.dual-range-input::-moz-range-track {
  height: 6px;
  background: transparent;
}

.dual-range-input.dual-range-min::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: #93c5fd;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  cursor: grab;
  pointer-events: auto;
}

.dual-range-input.dual-range-max::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: #1d4ed8;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  cursor: grab;
  pointer-events: auto;
}

.dual-range-min {
  z-index: 1;
}

.dual-range-max {
  z-index: 2;
}

.filter-hint {
  margin: 6px 0 0;
  font-size: 10px;
  color: #9ca3af;
  line-height: 1.35;
}

.grid {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0 10px 10px;
  max-height: 340px;
  overflow-y: auto;
}

.grid-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 6px;
  background: #fff;
  border: 1px solid #e4e6eb;
  border-radius: 8px;
}

.grid-thumb {
  position: relative;
  aspect-ratio: 1;
  width: 100%;
  border-radius: 6px;
  overflow: hidden;
  background: #e8eaef;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb-select {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 3;
  width: 18px;
  height: 18px;
  margin: 0;
  cursor: pointer;
  accent-color: #2563eb;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.85);
  border-radius: 3px;
}

.grid-thumb img {
  max-width: 100%;
  max-height: 100%;
  width: 100%;
  height: 100%;
  object-fit: contain;
  vertical-align: middle;
}

.thumb-fallback {
  font-size: 14px;
  color: #9ca3af;
}

.grid-meta {
  margin-top: 6px;
  min-height: 2.4em;
}

.grid-meta .tag {
  display: block;
  font-size: 9px;
  line-height: 1.35;
  padding: 3px 4px;
  border-radius: 4px;
  background: #eef2ff;
  color: #4338ca;
  text-align: center;
  word-break: break-word;
}

.grid-actions {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 6px;
  margin-top: 6px;
}

.grid-actions button {
  flex: 1;
  min-width: 0;
  padding: 4px 4px;
  font-size: 11px;
}

.btn-copy {
  border-color: #c9ced6;
  background: #fff;
}

</style>
