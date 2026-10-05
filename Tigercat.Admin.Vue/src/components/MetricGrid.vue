<script setup lang="ts">
withDefaults(defineProps<{
  columns?: 3 | 4
}>(), {
  columns: 3
})
</script>

<template>
  <div
    class="grid gap-3 sm:gap-4"
    :class="columns === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'"
  >
    <slot />
  </div>
</template>
