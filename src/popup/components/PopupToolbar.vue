<script setup>
import { t } from "../../lib/i18n.js";
import IconGlyph from "../../components/IconGlyph.vue";
import ImageSizeFilters from "./ImageSizeFilters.vue";

defineProps({
  allFilteredSelected: { type: Boolean, required: true },
  listVisible: { type: Boolean, required: true },
  hasFilteredImages: { type: Boolean, required: true },
  downloadingAll: { type: Boolean, required: true },
  selectedCount: { type: Number, required: true },
  showFilters: { type: Boolean, default: false },
  sliderMaxW: { type: Number, required: true },
  sliderMaxH: { type: Number, required: true },
});

const filterMinW = defineModel("filterMinW", { type: Number, required: true });
const filterMaxW = defineModel("filterMaxW", { type: Number, required: true });
const filterMinH = defineModel("filterMinH", { type: Number, required: true });
const filterMaxH = defineModel("filterMaxH", { type: Number, required: true });

const emit = defineEmits(["refresh", "toggle-select-all", "download-selected", "open-settings"]);
</script>

<template>
  <header class="toolbar">
    <div class="bar">
      <h1>{{ t("headerTitle") }}</h1>
      <div class="actions">
        <button
          type="button"
          class="ext-btn ext-btn--icon"
          :title="t('tooltipRefresh')"
          :aria-label="t('tooltipRefresh')"
          @click="emit('refresh')"
        >
          <IconGlyph name="refresh" />
        </button>
        <button
          type="button"
          class="ext-btn"
          :title="allFilteredSelected ? t('tooltipDeselectAll') : t('tooltipSelectAll')"
          :disabled="!listVisible || !hasFilteredImages"
          @click="emit('toggle-select-all')"
        >
          {{ allFilteredSelected ? t("deselectAll") : t("selectAll") }}
        </button>
        <button
          type="button"
          class="ext-btn"
          :title="t('tooltipDownloadSelected')"
          :disabled="downloadingAll || !selectedCount"
          @click="emit('download-selected')"
        >
          {{ t("downloadSelected") }}
        </button>
        <button
          type="button"
          class="ext-btn ext-btn--icon"
          :title="t('tooltipSettings')"
          :aria-label="t('tooltipSettings')"
          @click="emit('open-settings')"
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
    </div>
    <ImageSizeFilters
      v-show="showFilters"
      v-model:filter-min-w="filterMinW"
      v-model:filter-max-w="filterMaxW"
      v-model:filter-min-h="filterMinH"
      v-model:filter-max-h="filterMaxH"
      :slider-max-w="sliderMaxW"
      :slider-max-h="sliderMaxH"
      embedded
    />
  </header>
</template>

<style scoped>
@import "../../styles/controls.css";

.toolbar {
  background: #fff;
  border-bottom: 1px solid #e4e6eb;
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
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

.btn-settings-icon {
  width: 18px;
  height: 18px;
  display: block;
  flex-shrink: 0;
}
</style>
