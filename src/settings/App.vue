<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import SettingsRangeField from "../components/SettingsRangeField.vue";
import SettingsTextField from "../components/SettingsTextField.vue";
import { t } from "../lib/i18n.js";
import { loadUserSettings, saveUserSettings } from "../lib/userSettings.js";

const popupWidthPx = ref(456);
const gridColumns = ref(3);
const downloadSubfolder = ref("");
const saving = ref(false);
let persistTimer;

async function refresh() {
  const s = await loadUserSettings();
  popupWidthPx.value = s.popupWidthPx;
  gridColumns.value = s.gridColumns;
  downloadSubfolder.value = s.downloadSubfolder;
}

function schedulePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    saving.value = true;
    try {
      const next = await saveUserSettings({
        popupWidthPx: popupWidthPx.value,
        gridColumns: gridColumns.value,
        downloadSubfolder: downloadSubfolder.value,
      });
      downloadSubfolder.value = next.downloadSubfolder;
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

    <SettingsTextField
      id="save-location"
      v-model="downloadSubfolder"
      :label="t('settingsLabelSaveLocation')"
      :hint="t('settingsHintSaveLocation')"
      :placeholder="t('settingsPlaceholderSaveLocation')"
      :busy="saving"
      @input="schedulePersist"
    />

    <SettingsRangeField
      id="w-range"
      v-model="popupWidthPx"
      :label="t('settingsLabelPopupWidth')"
      :hint="t('settingsHintPopupWidth')"
      :min="320"
      :max="800"
      :step="8"
      :value-text="t('settingsValuePx', [String(popupWidthPx)])"
      :busy="saving"
      @input="schedulePersist"
    />

    <SettingsRangeField
      id="c-range"
      v-model="gridColumns"
      :label="t('settingsLabelGridColumns')"
      :hint="t('settingsHintGridColumns')"
      :min="1"
      :max="6"
      :step="1"
      :value-text="t('settingsValueColumns', [String(gridColumns)])"
      :busy="saving"
      @input="schedulePersist"
    />

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
