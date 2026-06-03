<script setup lang="ts">
withDefaults(defineProps<{
  columns?: 3 | 4
}>(), {
  columns: 3
})
</script>

<template>
  <div
    class="grid grid-cols-1 gap-4"
    :class="columns === 4 ? 'md:grid-cols-3 xl:grid-cols-4' : 'md:grid-cols-3'"
  >
    <slot />
  </div>
</template>
