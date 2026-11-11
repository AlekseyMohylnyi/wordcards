<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from '@/components/TabBar.vue'
import UpdateBanner from '@/components/UpdateBanner.vue'

const route = useRoute()
const showTabs = computed(() => route.meta.tabs === true)
</script>

<template>
  <div class="app" :class="{ 'with-tabs': showTabs }">
    <UpdateBanner />
    <main class="app-main">
      <RouterView />
    </main>
    <TabBar v-if="showTabs" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100dvh;
}

.with-tabs .app-main {
  padding-bottom: calc(var(--tabbar-h) + var(--safe-bottom) + 8px);
}
</style>
