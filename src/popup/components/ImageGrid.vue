<script setup>
import ImageGridItem from "./ImageGridItem.vue";

defineProps({
  statusText: { type: String, required: true },
  statusError: { type: Boolean, default: false },
  listVisible: { type: Boolean, default: false },
  items: { type: Array, required: true },
  gridColumns: { type: Number, required: true },
  selectedKeys: { type: Object, required: true },
  thumbOk: { type: Function, required: true },
  copyLabels: { type: Object, required: true },
  downloadLabels: { type: Object, required: true },
});

const emit = defineEmits(["toggle-select", "thumb-error", "copy", "download"]);
</script>

<template>
  <section class="grid-panel">
    <div class="grid-scroll">
      <p class="status" :class="{ error: statusError }">{{ statusText }}</p>
      <div
        v-show="listVisible"
        class="grid"
        :style="{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }"
      >
        <ImageGridItem
          v-for="(item, index) in items"
          :key="item.url"
          :item="item"
          :index="index"
          :selected="selectedKeys.has(item.url)"
          :thumb-visible="thumbOk(item)"
          :copy-label="copyLabels[item.url]"
          :download-label="downloadLabels[item.url]"
          @toggle-select="emit('toggle-select', item, $event)"
          @thumb-error="emit('thumb-error', item)"
          @copy="emit('copy', item)"
          @download="emit('download', item, index)"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.grid-panel {
  margin: 0;
  padding: 0 10px 10px;
}

.grid-scroll {
  max-height: 450px;
  overflow-y: auto;
}

.status {
  margin: 0 2px 6px;
  font-size: 11px;
  color: #5c6370;
}

.status.error {
  color: #b91c1c;
}

.grid {
  display: grid;
  gap: 8px;
}
</style>
