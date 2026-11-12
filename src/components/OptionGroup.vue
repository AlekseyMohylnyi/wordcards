<script setup lang="ts" generic="T extends string | number">
// A row of buttons where exactly one is selected (accessible radio group).
defineProps<{
  options: { value: T; label: string; lang?: string }[]
  label: string
}>()
const model = defineModel<T>({ required: true })

function onKey(e: KeyboardEvent, options: { value: T }[]) {
  const i = options.findIndex((o) => o.value === model.value)
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') model.value = options[(i + 1) % options.length].value
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') model.value = options[(i - 1 + options.length) % options.length].value
  else return
  e.preventDefault()
  ;(e.currentTarget as HTMLElement).querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
}
</script>

<template>
  <div class="options" role="radiogroup" :aria-label="label" @keydown="onKey($event, options)">
    <button
      v-for="o in options"
      :key="String(o.value)"
      type="button"
      role="radio"
      :aria-checked="model === o.value"
      :tabindex="model === o.value ? 0 : -1"
      :lang="o.lang"
      :class="{ on: model === o.value }"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>

<style scoped>
.options {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: var(--radius-md);
  background: var(--c-surface-2);
}

button {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  font-weight: 800;
  font-size: 0.95rem;
  line-height: 1.15;
  color: var(--c-text-muted);
  /* long labels ("American (US)") wrap instead of overflowing */
  white-space: normal;
  overflow-wrap: anywhere;
}

button.on {
  background: var(--c-primary-fill);
  color: var(--c-on-primary);
  box-shadow: var(--c-shadow);
}
</style>
