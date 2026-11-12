<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number
    max: number
    size?: number
    stroke?: number
    /** CSS color for the progress arc */
    color?: string
    trackColor?: string
    label?: string
  }>(),
  { size: 88, stroke: 10, color: 'var(--c-know)', trackColor: 'var(--c-surface-2)', label: '' },
)

const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const fraction = computed(() => (props.max > 0 ? Math.min(1, Math.max(0, props.value / props.max)) : 0))
const offset = computed(() => circumference.value * (1 - fraction.value))
</script>

<template>
  <div
    class="ring"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="progressbar"
    :aria-valuenow="value"
    :aria-valuemin="0"
    :aria-valuemax="max"
    :aria-label="label"
  >
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" aria-hidden="true">
      <circle :cx="size / 2" :cy="size / 2" :r="radius" :stroke-width="stroke" :stroke="trackColor" fill="none" />
      <circle
        class="arc"
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        :stroke-width="stroke"
        :stroke="color"
        fill="none"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        :transform="`rotate(-90 ${size / 2} ${size / 2})`"
      />
    </svg>
    <div class="center"><slot /></div>
  </div>
</template>

<style scoped>
.ring {
  position: relative;
  flex: none;
}

.arc {
  transition: stroke-dashoffset 0.8s ease-out;
}

.center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 1.1;
}
</style>
