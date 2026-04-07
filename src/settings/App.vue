<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { t } from "../lib/i18n.js";
import { loadUserSettings, saveUserSettings } from "../lib/userSettings.js";

const popupWidthPx = ref(456);
const gridColumns = ref(3);
const saving = ref(false);
let persistTimer;

async function refresh() {
  const s = await loadUserSettings();
  popupWidthPx.value = s.popupWidthPx;
  gridColumns.value = s.gridColumns;
}

function schedulePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    saving.value = true;
    try {
      await saveUserSettings({
        popupWidthPx: popupWidthPx.value,
        gridColumns: gridColumns.value,
      });
    } finally {
      saving.value = false;
    }
  }, 120);
}

onMounted(refresh);
onUnmounted(() => clearTimeout(persistTimer));
</script>

<template>
  <div class="settings-page">
    <header class="settings-header">
      <h1>{{ t("settingsTitle") }}</h1>
      <p class="settings-lead">{{ t("settingsLead") }}</p>
    </header>

    <section class="settings-section" :aria-busy="saving || undefined">
      <label class="field-label" for="w-range">{{ t("settingsLabelPopupWidth") }}</label>
      <div class="field-row">
        <input
          id="w-range"
          v-model.number="popupWidthPx"
          type="range"
          min="320"
          max="800"
          step="8"
          @input="schedulePersist"
        />
        <output class="field-value" for="w-range">{{ t("settingsValuePx", [String(popupWidthPx)]) }}</output>
      </div>
      <p class="field-hint">{{ t("settingsHintPopupWidth") }}</p>
    </section>

    <section class="settings-section" :aria-busy="saving || undefined">
      <label class="field-label" for="c-range">{{ t("settingsLabelGridColumns") }}</label>
      <div class="field-row">
        <input
          id="c-range"
          v-model.number="gridColumns"
          type="range"
          min="1"
          max="6"
          step="1"
          @input="schedulePersist"
        />
        <output class="field-value" for="c-range">{{ t("settingsValueColumns", [String(gridColumns)]) }}</output>
      </div>
      <p class="field-hint">{{ t("settingsHintGridColumns") }}</p>
    </section>

    <p class="settings-footnote">{{ t("settingsFootnote") }}</p>
  </div>
</template>

<style scoped>
.settings-page {
  box-sizing: border-box;
  max-width: 520px;
  margin: 0 auto;
  padding: 24px 20px 32px;
  font-family:
    system-ui,
    -apple-system,
    "Segoe UI",
    Roboto,
    "Helvetica Neue",
    Arial,
    sans-serif;
  font-size: 14px;
  color: #1a1a1a;
  background: #f6f7f9;
  min-height: 100vh;
}

.settings-header h1 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
}

.settings-lead {
  margin: 0 0 24px;
  color: #5c6370;
  line-height: 1.45;
}

.settings-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e4e6eb;
  border-radius: 10px;
}

.field-label {
  display: block;
  font-weight: 500;
  margin-bottom: 10px;
  color: #374151;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.field-row input[type="range"] {
  flex: 1;
  min-width: 0;
  accent-color: #2563eb;
}

.field-value {
  flex-shrink: 0;
  min-width: 5em;
  font-variant-numeric: tabular-nums;
  color: #2563eb;
  font-weight: 500;
}

.field-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.4;
}

.settings-footnote {
  margin: 8px 0 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.45;
}

:global(body) {
  margin: 0;
}
</style>
