<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { ProgressRecord, WordStatus } from '@/types'
import { countByStatus, filterWords, loadAllProgress, moveRecord, saveProgress } from '@/services/wordsList'
import { isSpeechSupported, speak, speechText } from '@/services/speech'
import { useSettingsStore } from '@/stores/settings'

const UNDO_MS = 5000

const { t } = useI18n()
const route = useRoute()
const { settings } = useSettingsStore()

// Stats tiles open a specific tab: /words?tab=review
const tabFromRoute = (): WordStatus => (route.query.tab === 'review' ? 'review' : 'learned')
const tab = ref<WordStatus>(tabFromRoute())
watch(() => route.query.tab, () => (tab.value = tabFromRoute()))

const records = shallowRef<ProgressRecord[] | null>(null)
const query = ref('')
const canSpeak = isSpeechSupported()

onMounted(async () => {
  records.value = await loadAllProgress()
})

const counts = computed(() => countByStatus(records.value ?? []))
const list = computed(() => filterWords(records.value ?? [], tab.value, query.value))

const display = (r: ProgressRecord) => (r.forms ? r.forms.join(' – ') : r.word)
const listName = (s: WordStatus) => (s === 'learned' ? t('words.learned') : t('words.review'))

function say(r: ProgressRecord) {
  speak(speechText(r.word, r.forms), settings.voice, settings.rate === 'slow' ? 0.75 : 1)
}

function replaceRecord(r: ProgressRecord) {
  records.value = (records.value ?? []).map((x) => (x.wordId === r.wordId ? r : x))
}

// ---------- move with undo ----------
interface UndoInfo {
  previous: ProgressRecord
  word: string
  to: WordStatus
  key: number
}
const undo = ref<UndoInfo | null>(null)
let undoTimer: ReturnType<typeof setTimeout> | undefined
let undoKey = 0
const saveError = ref(false)

async function move(r: ProgressRecord) {
  const moved = moveRecord(r, Date.now())
  replaceRecord(moved)
  clearTimeout(undoTimer)
  undo.value = { previous: r, word: display(r), to: moved.status, key: ++undoKey }
  undoTimer = setTimeout(() => (undo.value = null), UNDO_MS)
  try {
    await saveProgress(moved)
    saveError.value = false
  } catch (e) {
    console.error(e)
    saveError.value = true
  }
}

async function undoMove() {
  const u = undo.value
  if (!u) return
  clearTimeout(undoTimer)
  undo.value = null
  replaceRecord(u.previous)
  try {
    await saveProgress(u.previous)
  } catch (e) {
    console.error(e)
    saveError.value = true
  }
}

onBeforeUnmount(() => clearTimeout(undoTimer))
</script>

<template>
  <div class="page words">
    <h1 class="page-title">{{ t('words.title') }}</h1>

    <div class="segmented" role="tablist">
      <button role="tab" :aria-selected="tab === 'learned'" :class="{ on: tab === 'learned' }" @click="tab = 'learned'">
        {{ t('words.learned') }} ({{ counts.learned }})
      </button>
      <button role="tab" :aria-selected="tab === 'review'" :class="{ on: tab === 'review' }" @click="tab = 'review'">
        {{ t('words.review') }} ({{ counts.review }})
      </button>
    </div>

    <div class="search">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
      </svg>
      <input
        v-model="query"
        type="search"
        :placeholder="t('words.search')"
        :aria-label="t('words.search')"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />
      <button v-if="query" class="clear" :aria-label="t('words.clear')" @click="query = ''">✕</button>
    </div>

    <p v-if="!records" class="muted">{{ t('stats.loading') }}</p>
    <p v-else-if="!list.length" class="card muted empty">
      {{ query.trim() ? t('words.notFound', { q: query.trim() }) : tab === 'learned' ? t('words.emptyLearned') : t('words.emptyReview') }}
    </p>

    <ul v-else class="list">
      <li v-for="r in list" :key="r.wordId" class="row">
        <button class="say" :aria-label="canSpeak ? t('words.say', { word: display(r) }) : display(r)" @click="say(r)">
          <span class="line">
            <span class="word" lang="en">{{ display(r) }}</span>
            <span class="level">{{ r.level }}</span>
          </span>
          <span class="tr">{{ r.translation.join(', ') }}</span>
        </button>
        <button
          class="move"
          :class="tab"
          :aria-label="t('words.moveTo', { word: display(r), list: listName(tab === 'learned' ? 'review' : 'learned') })"
          @click="move(r)"
        >
          <!-- to review: circular arrow; to learned: check -->
          <svg v-if="tab === 'learned'" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </li>
    </ul>

    <!-- Undo toast -->
    <div v-if="undo" :key="undo.key" class="toast" role="status">
      <span class="toast-text">{{ t('words.moved', { word: undo.word, list: listName(undo.to) }) }}</span>
      <button class="toast-undo" @click="undoMove">{{ t('words.undo') }}</button>
      <span class="toast-timer" aria-hidden="true" />
    </div>
    <p v-if="saveError" class="save-error" role="alert">{{ t('session.saveError') }}</p>
  </div>
</template>

<style scoped>
.words {
  padding-bottom: 96px;
}

/* ---------- tabs ---------- */
.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  margin-bottom: 12px;
  background: var(--c-surface-2);
  border-radius: var(--radius-md);
}

.segmented button {
  border-radius: var(--radius-sm);
  font-weight: 800;
  font-size: 0.95rem;
  color: var(--c-text-muted);
}

.segmented button.on {
  background: var(--c-surface);
  color: var(--c-text);
  box-shadow: var(--c-shadow);
}

/* ---------- search ---------- */
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 6px 0 14px;
  margin-bottom: 14px;
  border-radius: var(--radius-md);
  background: var(--c-surface);
  border: 2px solid var(--c-border);
  color: var(--c-text-muted);
}

.search:focus-within {
  border-color: var(--c-primary);
}

.search input {
  flex: 1;
  min-width: 0;
  min-height: 48px;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 1rem;
  color: var(--c-text);
}

.search input::-webkit-search-cancel-button {
  display: none;
}

.clear {
  border-radius: 50%;
  color: var(--c-text-muted);
}

/* ---------- list ---------- */
.empty {
  text-align: center;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: stretch;
  border-radius: var(--radius-md);
  background: var(--c-surface);
  box-shadow: var(--c-shadow);
  overflow: hidden;
}

.say {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 14px;
  text-align: left;
}

.say:active {
  background: var(--c-surface-2);
}

.line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  max-width: 100%;
}

.word {
  font-size: 1.08rem;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.level {
  flex: none;
  padding: 0 6px;
  border-radius: 6px;
  background: var(--c-surface-2);
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--c-text-muted);
}

.tr {
  font-size: 0.92rem;
  color: var(--c-text-muted);
}

.move {
  flex: none;
  width: 56px;
  border-left: 1px solid var(--c-border);
}

.move.learned {
  color: var(--c-unknown-text);
}

.move.review {
  color: var(--c-know-text);
}

.move:active {
  background: var(--c-surface-2);
}

/* ---------- undo toast ---------- */
.toast {
  position: fixed;
  z-index: 15;
  left: calc(12px + var(--safe-left));
  right: calc(12px + var(--safe-right));
  bottom: calc(var(--tabbar-h) + var(--safe-bottom) + 12px);
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 536px;
  margin: 0 auto;
  padding: 8px 8px 8px 16px;
  border-radius: var(--radius-md);
  background: var(--c-toast-bg);
  color: var(--c-toast-text);
  box-shadow: var(--c-shadow);
  overflow: hidden;
}

.toast-text {
  flex: 1;
  font-size: 0.92rem;
  font-weight: 700;
}

.toast-undo {
  padding: 0 14px;
  border-radius: var(--radius-sm);
  font-weight: 900;
  color: var(--c-toast-action);
}

.toast-timer {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  width: 100%;
  background: var(--c-toast-action);
  transform-origin: left;
  animation: countdown 5s linear forwards;
}

@keyframes countdown {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

.save-error {
  margin-top: 12px;
  text-align: center;
  color: var(--c-unknown-text);
}
</style>
