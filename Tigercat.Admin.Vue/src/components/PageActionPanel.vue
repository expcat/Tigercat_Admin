<script setup lang="ts">
import { Card } from '@expcat/tigercat-vue/Card'
import { Text } from '@expcat/tigercat-vue/Text'

defineProps<{
  title: string
  description: string
  stacked?: boolean
}>()
</script>

<template>
  <Card>
    <div class="flex flex-col gap-4" :class="stacked ? '' : 'lg:flex-row lg:items-center lg:justify-between'">
      <div class="min-w-0 space-y-1">
        <Text weight="bold">{{ title }}</Text>
        <Text size="sm" color="secondary">
          {{ description }}
        </Text>
      </div>
      <div
        v-if="$slots.actions"
        :class="stacked ? 'w-full' : 'flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center'"
      >
        <slot name="actions" />
      </div>
    </div>
  </Card>
</template>
