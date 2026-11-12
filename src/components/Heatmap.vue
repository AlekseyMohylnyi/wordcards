<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HeatCell } from '@/services/stats'

const props = defineProps<{
  weeks: (HeatCell | null)[][]
  /** Month labels: column index → text */
  months: { col: number; label: string }[]
  /** Monday-first short weekday names (7) */
  dayNames: string[]
  label: string
  lessLabel: string
  moreLabel: string
  describe: (cell: HeatCell) => string
}>()

const CELL = 12
const GAP = 3
const STEP = CELL + GAP
const PAD_L = 24
const PAD_T = 16
const width = computed(() => PAD_L + props.weeks.length * STEP)
const height = PAD_T + 7 * STEP

const cells = computed(() =>
  props.weeks.flatMap((week, col) =>
    week.flatMap((cell, row) => (cell ? [{ ...cell, x: PAD_L + col * STEP, y: PAD_T + row * STEP }] : [])),
  ),
)

// Tap a day to see its count; default: today (the last cell)
const selectedDate = ref<string | null>(null)
const selected = computed(() => cells.value.find((c) => c.date === selectedDate.value) ?? cells.value.at(-1))
</script>

<template>
  <figure class="heatmap">
    <svg :viewBox="`0 0 ${width} ${height}`" role="img" :aria-label="label">
      <text v-for="m in months" :key="m.col" class="axis" :x="PAD_L + m.col * STEP" :y="10">{{ m.label }}</text>
      <template v-for="(name, i) in dayNames" :key="name">
        <text v-if="i % 2 === 0" class="axis" :x="0" :y="PAD_T + i * STEP + CELL - 2">{{ name }}</text>
      </template>

      <rect
        v-for="c in cells"
        :key="c.date"
        :x="c.x"
        :y="c.y"
        :width="CELL"
        :height="CELL"
        rx="3"
        :class="[`l${c.level}`, { on: selected?.date === c.date }]"
        @click="selectedDate = c.date"
        @pointerenter="selectedDate = c.date"
      >
        <title>{{ describe(c) }}</title>
      </rect>
    </svg>

    <div class="foot">
      <p v-if="selected" class="caption">{{ describe(selected) }}</p>
      <div class="legend" aria-hidden="true">
        <span>{{ lessLabel }}</span>
        <i v-for="l in 5" :key="l" :class="`l${l - 1}`" />
        <span>{{ moreLabel }}</span>
      </div>
    </div>
  </figure>
</template>

<style scoped>
.heatmap {
  margin: 0;
}

svg {
  display: block;
  width: 100%;
  height: auto;
}

.axis {
  font-size: 9px;
  font-weight: 700;
  fill: var(--c-text-muted);
}

rect {
  cursor: pointer;
}

rect.on {
  stroke: var(--c-text);
  stroke-width: 1.5;
}

.l0 {
  fill: var(--c-heat-0);
  background: var(--c-heat-0);
}

.l1 {
  fill: var(--c-heat-1);
  background: var(--c-heat-1);
}

.l2 {
  fill: var(--c-heat-2);
  background: var(--c-heat-2);
}

.l3 {
  fill: var(--c-heat-3);
  background: var(--c-heat-3);
}

.l4 {
  fill: var(--c-heat-4);
  background: var(--c-heat-4);
}

.foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 12px;
  margin-top: 8px;
}

.caption {
  margin: 0;
  font-size: 0.9rem;
  color: var(--c-text);
}

.legend {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.75rem;
  color: var(--c-text-muted);
}

.legend i {
  width: 11px;
  height: 11px;
  border-radius: 3px;
}

.legend span:first-child {
  margin-right: 3px;
}

.legend span:last-child {
  margin-left: 3px;
}
</style>
