<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="page">
    <p class="card muted">{{ t('session.comingSoon') }}</p>
    <RouterLink to="/" class="btn btn-primary finish">{{ t('session.finish') }}</RouterLink>
  </div>
</template>

<style scoped>
.finish {
  margin-top: 16px;
  text-decoration: none;
}
</style>
