<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { Message } from '@expcat/tigercat-vue/Message'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import PageHeader from '../components/PageHeader.vue'
import MutedPanel from '../components/MutedPanel.vue'
import { usePermission } from '../utils/permission'

const DEMO_ACTIONS = [
  { code: 'user:create', label: '新增用户' },
  { code: 'user:delete', label: '删除用户' },
  { code: 'role:create', label: '新增角色' },
  { code: 'menu:create', label: '新建菜单' },
  { code: 'setting:edit', label: '保存设置' },
  { code: 'media:delete', label: '删除文件' },
  { code: 'notification:create', label: '创建通知' },
] as const

const MISSING_CODE = 'demo:forbidden'

const { codes, loaded, has, hasAny } = usePermission()
const codeList = computed(() => [...codes.value].sort())

function handleDemoAction(label: string) {
  Message.info({ content: `已触发「${label}」（演示，无写操作）`, duration: 2000 })
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      icon="lock"
      title="按钮权限"
      subtitle="用现有 v-permission / usePermission 按权限码隐藏按钮，不新增 Tigercat 权限组件"
      :tags="[
        { label: '演示', variant: 'primary' },
        { label: '现有 helpers', variant: 'info' },
      ]"
    />

    <MutedPanel
      compact
      description="无权限时按钮不显示。换只读账号或去掉对应权限码后刷新，入口会消失。点击只 toast，不写数据。"
    />

    <Card>
      <template #header><Text weight="bold">当前会话权限码</Text></template>
      <MutedPanel v-if="!loaded" compact description="正在加载权限…" />
      <div v-else-if="codeList.length" class="flex flex-wrap gap-2">
        <Tag v-for="code in codeList" :key="code" variant="info" size="sm">
          {{ code }}
        </Tag>
      </div>
      <MutedPanel v-else compact description="当前会话没有权限码。" />
    </Card>

    <Card>
      <template #header><Text weight="bold">单码隐藏（v-permission）</Text></template>
      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          v-for="item in DEMO_ACTIONS"
          :key="item.code"
          v-permission="item.code"
          variant="outline"
          @click="handleDemoAction(item.label)"
        >
          {{ item.label }}
          <span class="ml-1 text-xs opacity-70">{{ item.code }}</span>
        </Button>
      </div>
      <Text size="sm" color="secondary" class="mt-3 block">
        有权限的按钮会显示；缺码的入口由 v-permission 隐藏。
      </Text>
    </Card>

    <Card>
      <template #header><Text weight="bold">缺权 fallback</Text></template>
      <Button v-if="has(MISSING_CODE)" @click="handleDemoAction('禁止操作')">禁止操作</Button>
      <Text v-else size="sm" color="secondary">已隐藏（缺 {{ MISSING_CODE }}）</Text>
    </Card>

    <Card>
      <template #header><Text weight="bold">任意 / 全部匹配</Text></template>
      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          v-permission.any="['user:view', 'role:view']"
          variant="outline"
          @click="handleDemoAction('查看用户或角色')"
        >
          查看用户或角色
          <span class="ml-1 text-xs opacity-70">any</span>
        </Button>
        <Button
          v-permission="['user:create', 'role:create']"
          variant="outline"
          @click="handleDemoAction('创建用户且角色')"
        >
          创建用户且角色
          <span class="ml-1 text-xs opacity-70">all</span>
        </Button>
      </div>
      <Text size="sm" color="secondary" class="mt-3 block">
        any：{{ hasAny('user:view', 'role:view') ? '通过' : '未通过' }}（user:view 或 role:view）。all：
        {{ has('user:create', 'role:create') ? '通过' : '未通过' }}（user:create 且 role:create）。
      </Text>
    </Card>
  </div>
</template>
