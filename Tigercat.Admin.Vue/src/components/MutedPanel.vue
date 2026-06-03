<script setup lang="ts">
import { Text } from '@expcat/tigercat-vue'

withDefaults(defineProps<{
  title?: string
  description: string
  compact?: boolean
}>(), {
  compact: false
})
</script>

<template>
  <div
    class="p2-muted-panel flex flex-col gap-2"
    :class="compact ? 'px-4 py-3' : 'p-4'"
  >
    <Text v-if="title" weight="bold">{{ title }}</Text>
    <Text size="sm" color="secondary">
      {{ description }}
    </Text>
  </div>
</template>
