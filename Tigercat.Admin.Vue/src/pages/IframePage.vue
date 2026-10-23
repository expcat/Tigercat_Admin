<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Button } from '@expcat/tigercat-vue/Button'
import { Empty } from '@expcat/tigercat-vue/Empty'
import PageHeader from '../components/PageHeader.vue'
import { isSafeIframeSrc } from '../utils/schema-routes'

const props = defineProps<{ src?: string }>()
const route = useRoute()
const iframeSrc = computed(() => {
  const fromMeta = typeof route.meta.iframeSrc === 'string' ? route.meta.iframeSrc : undefined
  const src = props.src || fromMeta
  return isSafeIframeSrc(src) ? src.trim() : undefined
})
const heading = computed(() => {
  if (typeof route.meta.title === 'string' && route.meta.title) return route.meta.title
  if (typeof route.meta.menuKey === 'string' && route.meta.menuKey) return route.meta.menuKey
  return '嵌入页面'
})
const reloadKey = ref(0)
const loadState = ref<'loading' | 'loaded' | 'slow' | 'error'>('loading')
let timer: ReturnType<typeof setTimeout> | undefined
watch([iframeSrc, reloadKey], () => {
  clearTimeout(timer)
  loadState.value = 'loading'
  if (!iframeSrc.value) return
  timer = setTimeout(() => {
    if (loadState.value === 'loading') loadState.value = 'slow'
  }, 15_000)
}, { immediate: true })
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="space-y-4">
    <PageHeader :title="heading" subtitle="查看嵌入内容；页面空白或无法加载时，可重新加载或在新窗口打开。" icon="globe" />
    <template v-if="iframeSrc">
      <div class="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" @click="reloadKey += 1">重新加载</Button>
        <a :href="iframeSrc" target="_blank" rel="noopener noreferrer" class="text-sm text-(--tiger-primary) hover:underline">在新窗口打开</a>
        <span role="status" class="p2-text-secondary text-sm">{{ loadState === 'loading' ? '正在加载嵌入内容…' : loadState === 'loaded' ? '嵌入页面已响应' : '' }}</span>
      </div>
      <Alert v-if="loadState === 'slow' || loadState === 'error'" type="warning" :title="loadState === 'slow' ? '加载等待较久，可重试或在新窗口打开' : '嵌入内容加载失败，请重试'" show-icon />
      <div :aria-busy="loadState === 'loading'" class="overflow-hidden rounded-[var(--tiger-radius-lg,12px)] border border-(--tiger-border,#e2e8f0) bg-(--tiger-bg-card,#fff)">
        <iframe
          :key="`${iframeSrc}:${reloadKey}`"
          :src="iframeSrc"
          :title="heading"
          @load="loadState = 'loaded'"
          @error="loadState = 'error'"
          class="block h-[min(70vh,720px)] w-full border-0"
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerpolicy="no-referrer"
        />
      </div>
    </template>
    <Empty v-else description="未提供可嵌入的地址" />
  </div>
</template>
