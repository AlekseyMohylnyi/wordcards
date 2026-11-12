<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Word } from '@/types'

const props = withDefaults(defineProps<{ word: Word; isReview?: boolean; flipped?: boolean; canSpeak?: boolean }>(), {
  isReview: false,
  flipped: false,
  canSpeak: true,
})
const emit = defineEmits<{ speak: [] }>()
const { t } = useI18n()

const title = computed(() => (props.word.forms ? props.word.forms.join(' – ') : props.word.word))
</script>

<template>
  <div class="scene">
    <div class="flip" :class="{ flipped }">
      <!-- Front: word, IPA, speaker, example -->
      <section class="face front" :aria-hidden="flipped">
        <span v-if="isReview" class="badge">{{ t('session.review') }}</span>
        <div class="front-main">
          <h2 class="word" :class="{ forms: !!word.forms }" lang="en">{{ title }}</h2>
          <p class="ipa">{{ word.ipa }}</p>
          <button v-if="canSpeak" class="speak" :aria-label="t('session.speak')" @click.stop="emit('speak')">
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
              <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
          <p class="example" lang="en">{{ word.example }}</p>
        </div>
        <p class="hint">{{ t('session.tapToFlip') }}</p>
      </section>

      <!-- Back: translation, example translation, synonyms -->
      <section class="face back" :aria-hidden="!flipped">
        <span v-if="isReview" class="badge">{{ t('session.review') }}</span>
        <div class="back-main">
          <p class="translation">{{ word.translation.join(', ') }}</p>
          <p class="example-uk">{{ word.exampleUk }}</p>
        </div>
        <p v-if="word.synonyms.length" class="synonyms">
          {{ t('session.synonyms') }}: <span lang="en">{{ word.synonyms.join(', ') }}</span>
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.scene {
  width: 100%;
  height: 100%;
  perspective: 1400px;
}

.flip {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.5s cubic-bezier(0.3, 0.7, 0.3, 1);
}

.flip.flipped {
  transform: rotateY(180deg);
}

.face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 22px 18px;
  text-align: center;
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: var(--c-shadow);
  border: 2px solid var(--c-border);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  overflow: hidden;
}

.back {
  transform: rotateY(180deg);
  background: var(--c-surface);
}

.badge {
  position: absolute;
  top: 14px;
  left: 14px;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--c-accent);
  color: #3b2f00;
  font-size: 0.8rem;
  font-weight: 900;
}

.front-main,
.back-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.word {
  font-size: clamp(2rem, 11vw, 2.8rem);
  line-height: 1.1;
  color: var(--c-text);
  overflow-wrap: anywhere;
}

.word.forms {
  font-size: clamp(1.4rem, 7vw, 1.9rem);
}

.ipa {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--c-text-muted);
}

.speak {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin-top: 8px;
  border-radius: 50%;
  background: var(--c-surface-2);
  color: var(--c-primary);
}

.speak:active {
  transform: scale(0.94);
}

.example {
  margin: 20px 0 0;
  max-width: 30ch;
  font-size: 1.08rem;
  font-weight: 700;
  line-height: 1.35;
}

.hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--c-text-muted);
}

.translation {
  margin: 0;
  font-size: clamp(1.6rem, 8vw, 2.2rem);
  font-weight: 900;
  line-height: 1.15;
  color: var(--c-primary);
}

.example-uk {
  margin: 8px 0 0;
  font-size: 1.08rem;
  font-weight: 700;
  line-height: 1.35;
}

.synonyms {
  margin: 0;
  font-size: 0.88rem;
  color: var(--c-text-muted);
}
</style>
