<script setup>
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  hint: { type: String, default: "" },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  step: { type: Number, default: 1 },
  valueText: { type: String, required: true },
  busy: { type: Boolean, default: false },
});

const model = defineModel({ type: Number, required: true });

const emit = defineEmits(["input"]);
</script>

<template>
  <section class="settings-section" :aria-busy="busy || undefined">
    <label class="field-label" :for="id">{{ label }}</label>
    <div class="field-row">
      <input
        :id="id"
        v-model.number="model"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        @input="emit('input')"
      />
      <output class="field-value" :for="id">{{ valueText }}</output>
    </div>
    <p v-if="hint" class="field-hint">{{ hint }}</p>
  </section>
</template>

<style scoped>
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
</style>
