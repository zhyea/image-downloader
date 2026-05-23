<script setup>
import { computed } from "vue";

const props = defineProps({
  label: { type: String, required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  ariaLabel: { type: String, default: "" },
  minTitle: { type: String, default: "" },
  maxTitle: { type: String, default: "" },
  minAriaLabel: { type: String, default: "" },
  maxAriaLabel: { type: String, default: "" },
});

const minValue = defineModel("minValue", { type: Number, required: true });
const maxValue = defineModel("maxValue", { type: Number, required: true });

const fillStyle = computed(() => {
  const cap = props.max || 1;
  const left = (minValue.value / cap) * 100;
  const width = Math.max(0, ((maxValue.value - minValue.value) / cap) * 100);
  return { left: `${left}%`, width: `${width}%` };
});
</script>

<template>
  <div class="filter-row">
    <span class="filter-label">{{ label }}</span>
    <span class="filter-bound filter-bound--min" :title="minTitle">{{ minValue }}</span>
    <div class="dual-range" role="group" :aria-label="ariaLabel">
      <div class="dual-range-track" aria-hidden="true">
        <div class="dual-range-fill" :style="fillStyle" />
      </div>
      <input
        v-model.number="minValue"
        class="dual-range-input dual-range-min"
        type="range"
        :min="min"
        :max="max"
        step="1"
        :title="minTitle"
        :aria-label="minAriaLabel"
        :aria-valuenow="minValue"
        :aria-valuemin="min"
        :aria-valuemax="max"
      />
      <input
        v-model.number="maxValue"
        class="dual-range-input dual-range-max"
        type="range"
        :min="min"
        :max="max"
        step="1"
        :title="maxTitle"
        :aria-label="maxAriaLabel"
        :aria-valuenow="maxValue"
        :aria-valuemin="min"
        :aria-valuemax="max"
      />
    </div>
    <span class="filter-bound filter-bound--max" :title="maxTitle">{{ maxValue }}</span>
  </div>
</template>

<style scoped>
.filter-row {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.filter-row:last-child {
  margin-bottom: 4px;
}

.filter-label {
  font-size: 11px;
  color: #374151;
  font-weight: 500;
  white-space: nowrap;
}

.filter-bound {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: #6b7280;
  min-width: 2.5em;
  text-align: center;
  white-space: nowrap;
}

.filter-bound--min {
  text-align: end;
}

.filter-bound--max {
  text-align: start;
}

.dual-range {
  position: relative;
  height: 28px;
  min-width: 0;
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
</style>
