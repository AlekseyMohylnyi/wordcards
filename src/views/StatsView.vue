<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="page">
    <h1 class="page-title">{{ t('stats.title') }}</h1>
    <p class="card muted">{{ t('stats.comingSoon') }}</p>
  </div>
</template>
