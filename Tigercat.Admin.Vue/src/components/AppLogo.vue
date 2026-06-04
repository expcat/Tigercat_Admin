<script setup lang="ts">
import { useId } from 'vue'

const props = withDefaults(defineProps<{
  size?: number | string
}>(), {
  size: 36
})

const gradientId = useId()
</script>

<template>
  <svg 
    :width="size" 
    :height="size" 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient :id="gradientId" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stop-color="#3B82F6" />
        <stop offset="1" stop-color="#4F46E5" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="30" :fill="`url(#${gradientId})`" />
    <path d="M50 25 V75 M30 25 H70" stroke="white" stroke-width="10" stroke-linecap="round" />
  </svg>
</template>
