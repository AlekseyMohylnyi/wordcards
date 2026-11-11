<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="page">
    <RouterLink to="/" class="btn btn-primary">{{ t('session.finish') }}</RouterLink>
  </div>
</template>
