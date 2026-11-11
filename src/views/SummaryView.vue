<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="page">
    <h1 class="page-title">{{ t('summary.title') }}</h1>
    <RouterLink to="/" class="btn btn-primary">{{ t('summary.toHome') }}</RouterLink>
  </div>
</template>
