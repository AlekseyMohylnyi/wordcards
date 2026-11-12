<script setup lang="ts">
import { computed, ref, watch } from 'vue'

export interface BarPoint {
  key: string
  /** Short axis label (may be empty to skip) */
  label: string
  value: number
  /** Full description for the caption / screen readers */
  title: string
}

const props = withDefaults(defineProps<{ points: BarPoint[]; label: string; valueLabel?: (v: number) => string }>(), {
  valueLabel: (v: number) => String(v),
})

// Fixed coordinate system; the SVG scales to the container width
const W = 320
const H = 168
const PAD_L = 26
const PAD_R = 4
const PAD_T = 22
const PAD_B = 22
const plotW = W - PAD_L - PAD_R
const plotH = H - PAD_T - PAD_B
const base = PAD_T + plotH

/** Round the axis max up to a readable number */
function niceMax(v: number): number {
  if (v <= 5) return 5
  const pow = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * pow) return m * pow
  return 10 * pow
}

const max = computed(() => niceMax(Math.max(0, ...props.points.map((p) => p.value))))
const band = computed(() => plotW / Math.max(1, props.points.length))
const barW = computed(() => Math.max(3, Math.min(22, band.value * 0.62)))

const bars = computed(() =>
  props.points.map((p, i) => {
    const h = (p.value / max.value) * plotH
    const x = PAD_L + i * band.value + (band.value - barW.value) / 2
    return { ...p, i, x, h, top: base - h, cx: x + barW.value / 2 }
  }),
)

/** Bar with a rounded top (4px) anchored to the baseline */
function barPath(x: number, top: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h)
  return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`
}

// Selected bar shows its value; defaults to the last one (today)
const selected = ref(props.points.length - 1)
watch(
  () => props.points.map((p) => p.key).join(),
  () => (selected.value = props.points.length - 1),
)
const current = computed(() => bars.value[selected.value])
</script>

<template>
  <figure class="bar-chart">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="label">
      <!-- recessive grid: 0, half, max -->
      <g class="grid">
        <template v-for="f in [0, 0.5, 1]" :key="f">
          <line :x1="PAD_L" :x2="W - PAD_R" :y1="base - f * plotH" :y2="base - f * plotH" />
          <text :x="PAD_L - 6" :y="base - f * plotH + 4" text-anchor="end">{{ Math.round(f * max) }}</text>
        </template>
      </g>

      <g class="bars">
        <path
          v-for="b in bars"
          v-show="b.value > 0"
          :key="b.key"
          :d="barPath(b.x, b.top, barW, b.h)"
          :class="{ on: b.i === selected }"
        />
      </g>

      <!-- value above the selected bar -->
      <text v-if="current && current.value > 0" class="value" :x="current.cx" :y="current.top - 6" text-anchor="middle">
        {{ current.value }}
      </text>

      <g class="labels">
        <text v-for="b in bars" :key="b.key" :x="b.cx" :y="H - 6" text-anchor="middle" :class="{ on: b.i === selected }">
          {{ b.label }}
        </text>
      </g>

      <!-- hit targets: whole column, bigger than the bar -->
      <rect
        v-for="b in bars"
        :key="`hit-${b.key}`"
        class="hit"
        :x="PAD_L + b.i * band"
        :y="PAD_T - 16"
        :width="band"
        :height="plotH + 16"
        @pointerenter="selected = b.i"
        @click="selected = b.i"
      />
    </svg>
    <figcaption v-if="current" class="caption">{{ current.title }}: <strong>{{ valueLabel(current.value) }}</strong></figcaption>

    <table class="sr-only">
      <tbody>
        <tr v-for="p in points" :key="p.key">
          <th scope="row">{{ p.title }}</th>
          <td>{{ valueLabel(p.value) }}</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>

<style scoped>
.bar-chart {
  margin: 0;
}

svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.grid line {
  stroke: var(--c-border);
  stroke-width: 1;
}

.grid text,
.labels text {
  font-size: 10px;
  font-weight: 700;
  fill: var(--c-text-muted);
}

.labels text.on {
  fill: var(--c-text);
  font-weight: 900;
}

.bars path {
  fill: var(--c-heat-2);
  transition: fill 0.15s;
}

.bars path.on {
  fill: var(--c-heat-4);
}

.value {
  font-size: 12px;
  font-weight: 900;
  fill: var(--c-text);
}

.hit {
  fill: transparent;
  cursor: pointer;
}

.caption {
  margin-top: 6px;
  font-size: 0.9rem;
  color: var(--c-text-muted);
}

.caption strong {
  color: var(--c-text);
}
</style>
