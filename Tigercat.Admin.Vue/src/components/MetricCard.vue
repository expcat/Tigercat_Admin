<script setup lang="ts">
import { Card } from '@expcat/tigercat-vue/Card'
import { Loading } from '@expcat/tigercat-vue/Loading'
import { Statistic } from '@expcat/tigercat-vue/Statistic'
import { Text } from '@expcat/tigercat-vue/Text'

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
  >
    <div class="flex h-full items-center gap-3">
      <div
        v-if="$slots.icon"
        class="p2-icon-chip hidden h-10 w-10 shrink-0 items-center justify-center sm:flex"
      >
        <slot name="icon" />
      </div>
      <div class="min-w-0">
        <template v-if="loading">
          <Text size="sm" color="secondary">{{ title }}</Text>
          <div class="mt-2">
            <Loading size="sm" />
          </div>
        </template>
        <Statistic v-else-if="value !== undefined || badge !== undefined" :title="title" :value="value ?? badge ?? ''" />
        <Text v-else weight="bold">{{ title }}</Text>
        <Text v-if="description" size="sm" color="secondary">
          {{ description }}
        </Text>
      </div>
    </div>
  </component>
</template>
