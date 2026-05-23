<script setup>
import { t } from "../../lib/i18n.js";
import { sourceLabel, formatItemDimensions } from "../../lib/imageMeta.js";

defineProps({
  item: { type: Object, required: true },
  index: { type: Number, required: true },
  selected: { type: Boolean, required: true },
  thumbVisible: { type: Boolean, required: true },
  copyLabel: { type: String, default: "" },
  downloadLabel: { type: String, default: "" },
});

const emit = defineEmits(["toggle-select", "thumb-error", "copy", "download"]);
</script>

<template>
  <div class="grid-item">
    <div class="grid-thumb">
      <input
        type="checkbox"
        class="thumb-select"
        :checked="selected"
        :aria-label="t('selectForDownload')"
        :title="t('selectForDownload')"
        @click.stop
        @change="emit('toggle-select', $event.target.checked)"
      />
      <template v-if="thumbVisible">
        <img
          alt=""
          referrerpolicy="no-referrer"
          loading="lazy"
          :src="item.url"
          @error="emit('thumb-error')"
        />
      </template>
      <span v-else class="thumb-fallback">—</span>
    </div>
    <div class="grid-meta">
      <span class="tag">{{ sourceLabel(item.source) }} · {{ formatItemDimensions(item) }}</span>
    </div>
    <div class="grid-actions">
      <button
        type="button"
        class="ext-btn btn-copy"
        :title="t('tooltipCopyLink')"
        @click="emit('copy')"
      >
        {{ copyLabel || t("copyLink") }}
      </button>
      <button type="button" class="ext-btn ext-btn--primary btn-dl" @click="emit('download')">
        {{ downloadLabel || t("download") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
@import "../../styles/controls.css";

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
  padding: 4px;
  font-size: 11px;
}

.btn-copy {
  border-color: #c9ced6;
  background: #fff;
}
</style>
