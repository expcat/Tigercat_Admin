<script setup lang="ts">
import { Tag } from '@expcat/tigercat-vue/Tag'
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
  <TigerPageHeader :show-back="false" :sub-title="props.subtitle" class-name="min-w-0 overflow-hidden [&_.tiger-page-header-title-row]:flex-col [&_.tiger-page-header-title-row]:items-start">
    <template #title>
      <span class="flex min-w-0 items-center gap-3">
        <span class="p2-icon-chip flex h-10 w-10 shrink-0 items-center justify-center">
          <Icon :name="props.icon" :size="24" />
        </span>
        <span class="min-w-0 text-xl font-semibold tracking-tight sm:text-2xl">{{ props.title }}</span>
      </span>
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
