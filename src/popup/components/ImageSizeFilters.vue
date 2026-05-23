<script setup>
import DualRange from "../../components/DualRange.vue";
import { t } from "../../lib/i18n.js";

defineProps({
  sliderMaxW: { type: Number, required: true },
  sliderMaxH: { type: Number, required: true },
});

const filterMinW = defineModel("filterMinW", { type: Number, required: true });
const filterMaxW = defineModel("filterMaxW", { type: Number, required: true });
const filterMinH = defineModel("filterMinH", { type: Number, required: true });
const filterMaxH = defineModel("filterMaxH", { type: Number, required: true });
</script>

<template>
  <div class="filters">
    <DualRange
      v-model:min-value="filterMinW"
      v-model:max-value="filterMaxW"
      :label="t('filterWidth')"
      :min="0"
      :max="sliderMaxW"
      :aria-label="t('ariaWidthRange')"
      :min-title="t('titleMinWidth')"
      :max-title="t('titleMaxWidth')"
      :min-aria-label="t('titleMinWidth')"
      :max-aria-label="t('titleMaxWidth')"
    />
    <DualRange
      v-model:min-value="filterMinH"
      v-model:max-value="filterMaxH"
      :label="t('filterHeight')"
      :min="0"
      :max="sliderMaxH"
      :aria-label="t('ariaHeightRange')"
      :min-title="t('titleMinHeight')"
      :max-title="t('titleMaxHeight')"
      :min-aria-label="t('titleMinHeight')"
      :max-aria-label="t('titleMaxHeight')"
    />
  </div>
</template>

<style scoped>
.filters {
  margin: 0 10px 8px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #e4e6eb;
  border-radius: 8px;
}
</style>
