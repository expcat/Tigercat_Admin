<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Empty } from '@expcat/tigercat-vue/Empty'
import PageHeader from '../components/PageHeader.vue'
import { isSafeIframeSrc } from '../utils/schema-routes'

const props = defineProps<{
  src?: string
}>()

const route = useRoute()

const iframeSrc = computed(() => {
  const fromMeta =
    typeof route.meta.iframeSrc === 'string' ? route.meta.iframeSrc : undefined
  const src = props.src || fromMeta
  return isSafeIframeSrc(src) ? src : undefined
})

const heading = computed(() => {
  if (typeof route.meta.title === 'string' && route.meta.title) {
    return route.meta.title
  }
  if (typeof route.meta.menuKey === 'string' && route.meta.menuKey) {
    return route.meta.menuKey
  }
  return '嵌入页面'
})
</script>

<template>
  <div class="space-y-4">
    <PageHeader
      :title="heading"
      subtitle="该页面由菜单 schema 的 iframeSrc 嵌入，没有独立业务页。"
      icon="globe"
    />
    <div
      v-if="iframeSrc"
      class="overflow-hidden rounded-[var(--tiger-radius-lg,12px)] border border-(--tiger-border,#e2e8f0) bg-(--tiger-bg-card,#fff)"
    >
      <iframe
        :src="iframeSrc"
        :title="heading"
        class="block h-[min(70vh,720px)] w-full border-0"
        sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        referrerpolicy="no-referrer"
      />
    </div>
    <Empty v-else description="未提供可嵌入的地址" />
  </div>
</template>
