<script setup>
import { computed } from "vue";
import PopupToolbar from "./components/PopupToolbar.vue";
import ImageGrid from "./components/ImageGrid.vue";
import { usePopupController } from "./composables/usePopupController.js";

const {
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
} = usePopupController();

const hasFilteredImages = computed(() => filteredImages.value.length > 0);
const showFilters = computed(() => listVisible.value && images.value.length > 0);
</script>

<template>
  <div class="popup-root" :style="{ width: `${popupWidthPx}px` }">
    <PopupToolbar
      v-model:filter-min-w="filterMinW"
      v-model:filter-max-w="filterMaxW"
      v-model:filter-min-h="filterMinH"
      v-model:filter-max-h="filterMaxH"
      :all-filtered-selected="allFilteredSelected"
      :list-visible="listVisible"
      :has-filtered-images="hasFilteredImages"
      :downloading-all="downloadingAll"
      :selected-count="selectedCount"
      :show-filters="showFilters"
      :slider-max-w="sliderMaxW"
      :slider-max-h="sliderMaxH"
      @refresh="runScan"
      @toggle-select-all="toggleSelectAllFiltered"
      @download-selected="onDownloadSelected"
      @open-settings="openSettingsPage"
    />
    <ImageGrid
      :status-text="statusText"
      :status-error="statusError"
      :list-visible="listVisible"
      :items="filteredImages"
      :grid-columns="gridColumns"
      :selected-keys="selectedKeys"
      :thumb-ok="thumbOk"
      :copy-labels="copyLabels"
      :download-labels="downloadLabels"
      @toggle-select="toggleRowSelect"
      @thumb-error="onThumbError"
      @copy="copyImageLink"
      @download="onDownloadOne"
    />
  </div>
</template>

<style scoped>
.popup-root {
  max-height: 720px;
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
</style>
