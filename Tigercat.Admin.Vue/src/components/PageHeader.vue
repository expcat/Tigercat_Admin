<script setup lang="ts">
import { Card, Text, Tag } from '@expcat/tigercat-vue'
import type { TagVariant } from '@expcat/tigercat-core'
import Icon from './Icon.vue'

interface PageHeaderTag {
  label: string
  variant: TagVariant
}

const props = defineProps<{
  title: string
  subtitle: string
  icon: string
  tags?: PageHeaderTag[]
}>()
</script>

<template>
  <Card class="overflow-hidden">
    <div class="relative">
      <div class="p2-page-accent absolute inset-0 -m-4"></div>
      <div class="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-3 mb-2">
            <div class="p2-icon-chip flex h-12 w-12 shrink-0 items-center justify-center">
              <Icon :name="props.icon" :size="24" />
            </div>
            <div class="min-w-0">
              <Text size="lg" weight="bold" class="p2-text-primary">
                {{ props.title }}
              </Text>
              <Text size="sm" color="secondary">
                {{ props.subtitle }}
              </Text>
            </div>
          </div>
        </div>
        <div v-if="props.tags?.length" class="hidden sm:flex items-center gap-2">
          <Tag v-for="tag in props.tags" :key="tag.label" :variant="tag.variant" size="sm">
            {{ tag.label }}
          </Tag>
        </div>
      </div>
    </div>
  </Card>
</template>
