<script setup>
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  hint: { type: String, default: "" },
  placeholder: { type: String, default: "" },
  busy: { type: Boolean, default: false },
});

const model = defineModel({ type: String, required: true });

const emit = defineEmits(["input"]);
</script>

<template>
  <section class="settings-section" :aria-busy="busy || undefined">
    <label class="field-label" :for="id">{{ label }}</label>
    <input
      :id="id"
      v-model="model"
      class="field-input"
      type="text"
      :placeholder="placeholder"
      spellcheck="false"
      autocomplete="off"
      @input="emit('input')"
    />
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

.field-input {
  box-sizing: border-box;
  width: 100%;
  padding: 8px 10px;
  font: inherit;
  border: 1px solid #c9ced6;
  border-radius: 6px;
  color: #1a1a1a;
  background: #fff;
}

.field-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.field-input::placeholder {
  color: #9ca3af;
}

.field-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.4;
}
</style>
