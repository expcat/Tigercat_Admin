<script setup lang="ts">
import { Card, Text } from '@expcat/tigercat-vue'

defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <Card>
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <Text weight="bold">{{ title }}</Text>
        <Text size="sm" color="secondary">
          {{ description }}
        </Text>
      </div>
      <div
        v-if="$slots.actions"
        class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
      >
        <slot name="actions" />
      </div>
    </div>
  </Card>
</template>
