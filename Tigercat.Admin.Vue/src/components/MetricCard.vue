<script setup lang="ts">
import { Badge, Card, Loading, Statistic, Text } from '@expcat/tigercat-vue'

withDefaults(
  defineProps<{
    title: string
    value?: string | number
    description?: string
    badge?: string | number
    loading?: boolean
    framed?: boolean
  }>(),
  {
    framed: true,
  }
)
</script>

<template>
  <component
    :is="framed === false ? 'div' : Card"
    class="group"
    :class="framed === false ? '' : 'hover:shadow-lg transition-shadow duration-300'"
  >
    <div class="flex items-center gap-3">
      <template v-if="$slots.icon">
        <Badge
          v-if="badge !== undefined"
          :content="badge"
          type="number"
          :show-zero="true"
          :standalone="false"
        >
          <div class="p2-icon-chip flex h-11 w-11 shrink-0 items-center justify-center transition-transform group-hover:scale-110">
            <slot name="icon" />
          </div>
        </Badge>
        <div
          v-else
          class="p2-icon-chip flex h-11 w-11 shrink-0 items-center justify-center transition-transform group-hover:scale-110"
        >
          <slot name="icon" />
        </div>
      </template>
      <div class="min-w-0">
        <template v-if="loading">
          <Text size="sm" color="secondary">{{ title }}</Text>
          <div class="mt-2">
            <Loading size="sm" />
          </div>
        </template>
        <Statistic v-else-if="value !== undefined" :title="title" :value="value" />
        <Text v-else weight="bold">{{ title }}</Text>
        <Text v-if="description" size="sm" color="secondary">
          {{ description }}
        </Text>
      </div>
    </div>
  </component>
</template>
