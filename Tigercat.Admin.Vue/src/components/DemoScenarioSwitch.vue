<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Select } from '@expcat/tigercat-vue/Select'

const DEMO_MODE = import.meta.env.VITE_TIGERCAT_DEMO === 'true'
const DEMO_SCENARIO_STORAGE_KEY = 'tigercat-admin:demo-scenario'

type DemoScenario = 'off' | 'slow' | 'fail-once' | 'empty-lists'

const DEMO_SCENARIO_OPTIONS: { value: DemoScenario; label: string }[] = [
  { value: 'off', label: '关闭' },
  { value: 'slow', label: '慢响应（800ms）' },
  { value: 'fail-once', label: '失败一次（503）' },
  { value: 'empty-lists', label: '空列表' },
]

function readDemoScenario(): DemoScenario {
  const value = window.sessionStorage.getItem(DEMO_SCENARIO_STORAGE_KEY)
  return DEMO_SCENARIO_OPTIONS.some((option) => option.value === value)
    ? value as DemoScenario
    : 'off'
}

const scenario = ref<DemoScenario>(DEMO_MODE ? readDemoScenario() : 'off')

function syncScenario() {
  if (document.visibilityState === 'visible') scenario.value = readDemoScenario()
}

function handleOpenChange(open: boolean) {
  if (open) syncScenario()
}

function handleScenarioChange(value: string | number | null | undefined) {
  const next = value == null ? 'off' : String(value) as DemoScenario
  scenario.value = next
  window.sessionStorage.setItem(DEMO_SCENARIO_STORAGE_KEY, next)
}

onMounted(() => {
  if (DEMO_MODE) document.addEventListener('visibilitychange', syncScenario)
})

onUnmounted(() => {
  if (DEMO_MODE) document.removeEventListener('visibilitychange', syncScenario)
})
</script>

<template>
  <Select
    v-if="DEMO_MODE"
    :model-value="scenario"
    :options="DEMO_SCENARIO_OPTIONS"
    aria-label="演示场景"
    class="!hidden w-36 xl:!block"
    @open-change="handleOpenChange"
    @update:model-value="handleScenarioChange"
  />
</template>
