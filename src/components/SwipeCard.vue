<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'

export type SwipeDir = 'left' | 'right'

const props = withDefaults(defineProps<{ disabled?: boolean; threshold?: number }>(), { disabled: false, threshold: 100 })
const emit = defineEmits<{ swipe: [dir: SwipeDir]; tap: [] }>()
const { t } = useI18n()

const TAP_SLOP = 8 // px of movement still treated as a tap
const FLICK_SPEED = 0.6 // px/ms: a fast flick also counts as a swipe
const FLY_MS = 320

const root = ref<HTMLElement>()
const dx = ref(0)
const dy = ref(0)
const dragging = ref(false)
const flying = ref(false)

let pointerId: number | null = null
let startX = 0
let startY = 0
let moved = false
let lastX = 0
let lastT = 0
let velocity = 0
let flyTimer: ReturnType<typeof setTimeout> | undefined

const style = computed(() => {
  const rot = Math.max(-18, Math.min(18, dx.value / 14))
  return {
    transform: `translate3d(${dx.value}px, ${dy.value * 0.25}px, 0) rotate(${rot}deg)`,
    transition: dragging.value ? 'none' : flying.value ? `transform ${FLY_MS}ms ease-in` : 'transform 0.25s ease-out',
  }
})
const knowOpacity = computed(() => Math.max(0, Math.min(1, dx.value / props.threshold)))
const unknownOpacity = computed(() => Math.max(0, Math.min(1, -dx.value / props.threshold)))

function onPointerDown(e: PointerEvent) {
  if (props.disabled || flying.value || pointerId !== null) return
  if (e.pointerType === 'mouse' && e.button !== 0) return
  // Buttons inside the card (speaker) handle their own taps
  if ((e.target as Element).closest('button, a')) return
  pointerId = e.pointerId
  try {
    root.value?.setPointerCapture(e.pointerId)
  } catch {
    // capture is an optimisation; dragging still works without it
  }
  dragging.value = true
  moved = false
  startX = lastX = e.clientX
  startY = e.clientY
  lastT = e.timeStamp
  velocity = 0
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value || e.pointerId !== pointerId) return
  dx.value = e.clientX - startX
  dy.value = e.clientY - startY
  if (!moved && Math.hypot(dx.value, dy.value) > TAP_SLOP) moved = true
  const dt = e.timeStamp - lastT
  if (dt > 0) velocity = (e.clientX - lastX) / dt
  lastX = e.clientX
  lastT = e.timeStamp
}

function endDrag(e: PointerEvent, cancelled: boolean) {
  if (e.pointerId !== pointerId) return
  try {
    root.value?.releasePointerCapture?.(e.pointerId)
  } catch {
    // not captured
  }
  pointerId = null
  dragging.value = false

  if (cancelled) return snapBack()
  if (!moved) {
    snapBack()
    emit('tap')
    return
  }
  const far = Math.abs(dx.value) >= props.threshold
  const flick = Math.abs(velocity) >= FLICK_SPEED && Math.abs(dx.value) > 40 && Math.sign(velocity) === Math.sign(dx.value)
  if (far || flick) emit('swipe', dx.value > 0 ? 'right' : 'left')
  else snapBack()
}

function snapBack() {
  dx.value = 0
  dy.value = 0
}

/** Animate the card off-screen. Used by both drag release and the buttons. */
function fly(dir: SwipeDir): Promise<void> {
  flying.value = true
  dragging.value = false
  const distance = window.innerWidth + 240
  dx.value = dir === 'right' ? distance : -distance
  return new Promise((resolve) => {
    flyTimer = setTimeout(resolve, FLY_MS)
  })
}

defineExpose({ fly })
onBeforeUnmount(() => clearTimeout(flyTimer))
</script>

<template>
  <div
    ref="root"
    class="swipe"
    :class="{ dragging }"
    :style="style"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endDrag($event, false)"
    @pointercancel="endDrag($event, true)"
  >
    <slot />
    <span class="stamp know" :style="{ opacity: knowOpacity }" aria-hidden="true">{{ t('session.stampKnow') }}</span>
    <span class="stamp unknown" :style="{ opacity: unknownOpacity }" aria-hidden="true">{{ t('session.stampUnknown') }}</span>
  </div>
</template>

<style scoped>
.swipe {
  position: relative;
  width: 100%;
  height: 100%;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
  will-change: transform;
}

.swipe.dragging {
  cursor: grabbing;
}

.stamp {
  position: absolute;
  top: 28px;
  padding: 4px 14px;
  border: 4px solid currentColor;
  border-radius: 14px;
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  background: var(--c-surface);
  pointer-events: none;
}

.stamp.know {
  left: 22px;
  color: var(--c-know-text);
  transform: rotate(-14deg);
}

.stamp.unknown {
  right: 22px;
  color: var(--c-unknown-text);
  transform: rotate(14deg);
}
</style>
