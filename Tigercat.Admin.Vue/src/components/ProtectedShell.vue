<script setup lang="ts">
import { inject } from 'vue'
import { Form, FormItem, Input, Modal } from '@expcat/tigercat-vue'
import MainLayout from './MainLayout.vue'
import type { Session, ThemePreferences } from '../utils'

const session = inject<import('vue').Ref<Session | null>>('session')!
const changeForm = inject<import('vue').Ref<{ oldPassword: string; newPassword: string }>>('changeForm')!
const changeOpen = inject<import('vue').Ref<boolean>>('changeOpen')!
const handleLogout = inject<() => void>('handleLogout')!
const handleChangePassword = inject<() => void>('handleChangePassword')!
const themePrefs = inject<import('vue').Ref<ThemePreferences>>('themePrefs')!
const toggleThemeMode = inject<() => void>('toggleThemeMode')!
</script>

<template>
  <MainLayout
    :session="session"
    :theme-mode="themePrefs.mode"
    :compact-mode="themePrefs.compactMode"
    @logout="handleLogout"
    @change-password="changeOpen = true"
    @toggle-theme="toggleThemeMode"
  >
    <RouterView v-slot="{ Component }">
      <Suspense>
        <template #default>
          <component :is="Component" />
        </template>
        <template #fallback>
          <div class="flex items-center justify-center h-full min-h-50">
            <div class="text-slate-500">加载中...</div>
          </div>
        </template>
      </Suspense>
    </RouterView>

    <Modal
      v-model="changeOpen"
      title="修改密码"
      ok-text="确认修改"
      cancel-text="取消"
      @ok="handleChangePassword"
      @cancel="changeOpen = false"
    >
      <Form :model="changeForm" :label-width="88">
        <FormItem name="oldPassword" label="旧密码">
          <Input
            v-model="changeForm.oldPassword"
            placeholder="请输入旧密码"
          />
        </FormItem>
        <FormItem name="newPassword" label="新密码">
          <Input
            v-model="changeForm.newPassword"
            placeholder="请输入新密码"
          />
        </FormItem>
      </Form>
    </Modal>
  </MainLayout>
</template>
