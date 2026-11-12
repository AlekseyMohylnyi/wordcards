<script setup lang="ts">
import type { CategoryFilter } from '@/services/wordSource'

withDefaults(defineProps<{ name: CategoryFilter; size?: number }>(), { size: 24 })

// 24×24 stroke icons
const PATHS: Record<CategoryFilter, string> = {
  mix: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  home: 'M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6',
  nature: 'M12 22V12M12 12C12 7 8 4 4 4c0 5 3 8 8 8zM12 14c0-4 3-7 8-7 0 4-3 7-8 7z',
  travel: 'M4 8h16v12H4zM9 8V5h6v3M9 12v4M15 12v4',
  food: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-3 5-3 8h3v10',
  work: 'M3 8h18v11H3zM8 8V5h8v3M3 13h18',
  health: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8zM7 12h3l1.5-3 2 6 1.5-3h2',
  city: 'M3 21h18M5 21V7l6-3v17M11 21V9h8v12M8 9v.01M8 13v.01M8 17v.01M15 13v.01M15 17v.01',
  feelings: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01',
  tech: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2',
  shopping: 'M3 4h2l2.4 11h11L21 8H6.2M9 20h.01M18 20h.01',
  sport: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4',
  family: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M17 11a3 3 0 1 0 0-6M22 21v-1a5 5 0 0 0-4-4.9',
  clothes: 'M8 3 3 6l2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z',
  communication: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12zM8 12h.01M12 12h.01M16 12h.01',
}
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true">
    <path :d="PATHS[name]" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
