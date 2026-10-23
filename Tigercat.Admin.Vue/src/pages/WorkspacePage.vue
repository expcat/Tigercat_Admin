<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Text } from '@expcat/tigercat-vue/Text'
import PageHeader from '../components/PageHeader.vue'
import { usePermission } from '../utils/permission'
import { APPROVAL_DEMO_ACTOR_EVENT } from '../utils/approvals'
import { NOTIFICATIONS_CHANGED_EVENT } from '../utils/notifications'
import { createWorkspaceState, fetchWorkspaceSection, WORKSPACE_SECTIONS } from '../utils/workspace'
import type { Session, WorkspaceSectionKey } from '../utils/types'

const session = inject<Ref<Session | null>>('session', ref(null))
const username = computed(() => session.value?.username ?? '')
const { has, loaded } = usePermission()
const canViewTasks = computed(() => has('task:view'))
const canViewNotifications = computed(() => has('notification:view'))
const sections = ref(createWorkspaceState())
const requests: Partial<Record<WorkspaceSectionKey, AbortController>> = {}

async function loadSection(key: WorkspaceSectionKey) {
  requests[key]?.abort()
  const controller = new AbortController()
  requests[key] = controller
  sections.value[key] = { items: [], total: null, note: '', loading: true, error: '' }
  if (!username.value || (key === 'tasks' && !canViewTasks.value) || (key === 'notifications' && !canViewNotifications.value)) {
    sections.value[key].loading = false
    return
  }
  try {
    const data = await fetchWorkspaceSection(key, username.value, controller.signal)
    if (!controller.signal.aborted) sections.value[key] = { ...data, loading: false, error: '' }
  } catch (error) {
    if (!controller.signal.aborted) sections.value[key] = {
      items: [], total: null, loading: false, error: error instanceof Error ? error.message : '加载失败，请重试。',
    }
  }
}

function abortRequests() { Object.values(requests).forEach(controller => controller.abort()) }
function syncActor() { void loadSection('approvals') }
function syncNotifications() { void loadSection('notifications') }
watch([username, canViewTasks, canViewNotifications], () => {
  abortRequests()
  WORKSPACE_SECTIONS.forEach(section => void loadSection(section.key))
}, { immediate: true })
onMounted(() => {
  window.addEventListener(APPROVAL_DEMO_ACTOR_EVENT, syncActor)
  window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, syncNotifications)
})
onBeforeUnmount(() => {
  abortRequests()
  window.removeEventListener(APPROVAL_DEMO_ACTOR_EVENT, syncActor)
  window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, syncNotifications)
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="我的工作台" :subtitle="`当前账号：${username || '尚未就绪'}。查看任务与共享协作信息，各块可独立刷新。`" icon="clipboard" />
    <div class="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
      <section v-for="section in WORKSPACE_SECTIONS" :key="section.key" :aria-label="section.title" class="min-w-0">
        <Card>
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h2 class="font-semibold">{{ section.title }}</h2>
              <Button v-if="!section.permission || has(section.permission)" size="sm" variant="outline" :disabled="sections[section.key].loading" @click="loadSection(section.key)">
                {{ sections[section.key].error ? '重试' : '刷新' }}{{ section.title }}
              </Button>
            </div>
          </template>
          <div class="space-y-3">
            <Text tag="p" size="sm" color="secondary">{{ section.description }}</Text>
            <Text v-if="section.permission && !has(section.permission)" tag="p" role="status">
              {{ loaded ? `需要 ${section.permission} 权限，未请求此数据。` : '正在确认访问权限…' }}
            </Text>
            <Text v-else-if="sections[section.key].loading" tag="p" role="status">正在加载{{ section.title }}…</Text>
            <div v-else-if="sections[section.key].error" role="alert"><Text color="danger">{{ sections[section.key].error }}</Text></div>
            <template v-else>
              <Text v-if="sections[section.key].note" tag="p" size="sm" color="secondary">{{ sections[section.key].note }}</Text>
              <Text v-if="sections[section.key].total !== null" tag="p" size="sm" role="status">显示 {{ sections[section.key].items.length }} / 共 {{ sections[section.key].total }} 条</Text>
              <ul v-if="sections[section.key].items.length" class="divide-y divide-(--tiger-border)" :aria-label="`${section.title}列表`">
                <li v-for="item in sections[section.key].items" :key="item.id" class="space-y-1 break-words py-3">
                  <RouterLink v-if="item.href && (!item.permission || has(item.permission))" class="p2-text-primary underline" :to="item.href">{{ item.title }}</RouterLink>
                  <Text v-else tag="p">{{ item.title }}</Text>
                  <Text tag="p" size="sm" color="secondary">{{ item.description }}</Text>
                  <Text v-if="item.permission && !has(item.permission)" tag="p" size="sm" color="secondary">目标需要 {{ item.permission }} 权限</Text>
                </li>
              </ul>
              <Text v-else-if="sections[section.key].total !== null" tag="p">当前范围内暂无记录。</Text>
            </template>
            <RouterLink v-if="!section.permission || has(section.permission)" class="p2-text-primary underline inline-block" :to="section.href">打开{{ section.key === 'tasks' ? '任务面板' : section.key === 'notifications' ? '通知中心' : section.key === 'calendar' ? '团队日历' : '审批中心' }}</RouterLink>
          </div>
        </Card>
      </section>
    </div>
  </div>
</template>
