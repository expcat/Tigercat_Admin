<script setup lang="ts">
import { Card, Text, Tag } from '@expcat/tigercat-vue'
import Icon from './Icon.vue'

interface PageHeaderTag {
  label: string
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange'
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
      <div class="absolute inset-0 bg-linear-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 -m-4"></div>
      <div class="relative flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <div class="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg text-white">
              <Icon :name="props.icon" :size="24" class="text-white" />
            </div>
            <div>
              <Text size="lg" weight="bold" class="text-slate-800">
                {{ props.title }}
              </Text>
              <Text size="sm" color="secondary">
                {{ props.subtitle }}
              </Text>
            </div>
          </div>
        </div>
        <div v-if="props.tags?.length" class="hidden sm:flex items-center gap-2">
          <Tag v-for="tag in props.tags" :key="tag.label" :color="tag.color" size="sm">
            {{ tag.label }}
          </Tag>
        </div>
      </div>
    </div>
  </Card>
</template>
