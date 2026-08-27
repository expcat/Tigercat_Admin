<script setup lang="ts">
import { Text, Tag } from '@expcat/tigercat-vue'
import { PageHeader as TigerPageHeader } from '@expcat/tigercat-vue/PageHeader'
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
  <TigerPageHeader :show-back="false" class-name="min-w-0 overflow-hidden">
    <template #title>
      <div class="flex min-w-0 items-center gap-3">
        <div class="p2-icon-chip flex h-12 w-12 shrink-0 items-center justify-center">
          <Icon :name="props.icon" :size="24" />
        </div>
        <div class="min-w-0">
          <Text size="lg" weight="bold" class="p2-text-primary block truncate">
            {{ props.title }}
          </Text>
          <Text size="sm" color="secondary" class="block">
            {{ props.subtitle }}
          </Text>
        </div>
      </div>
    </template>
    <template v-if="props.tags?.length" #actions>
      <div class="hidden sm:flex items-center gap-2">
        <Tag v-for="tag in props.tags" :key="tag.label" :variant="tag.variant" size="sm">
          {{ tag.label }}
        </Tag>
      </div>
    </template>
  </TigerPageHeader>
</template>
