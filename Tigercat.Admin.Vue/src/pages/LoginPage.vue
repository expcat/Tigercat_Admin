<script setup lang="ts">
import { ref } from 'vue'
import { Alert, Button, Card, Divider, Form, FormItem, Input } from '@expcat/tigercat-vue'
import { debounce, useAuthForm, apiRequest, type Session, type Notice } from '../utils'

const emit = defineEmits<{
  (e: 'success', session: Session): void;
  (e: 'switch', key: string): void;
}>()

const { form, errors, setField, validateForm } = useAuthForm({ username: '', password: '' })
const loading = ref(false)
const notice = ref<Notice>({ type: '', message: '' })

const handleLogin = debounce(async () => {
  if (!validateForm()) return

  notice.value = { type: '', message: '' }
  loading.value = true
  try {
    const payload = await apiRequest<{ token: string; username: string; expiresAt: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(form.value),
    })
    
    if (!payload?.data) {
      throw new Error('API request failed');
    }

    const nextSession: Session = {
      token: payload.data.token,
      username: payload.data.username,
      expiresAt: payload.data.expiresAt,
    }
    emit('success', nextSession)
  } catch (error: any) {
    notice.value = { type: 'error', message: error.message }
  } finally {
    loading.value = false
  }
}, 300)
</script>

<template>
  <Card title="Tigercat Admin 登录" class="max-w-xl mx-auto">
    <Alert
      v-if="notice.message"
      :type="notice.type || 'info'"
      :title="notice.type === 'error' ? '操作失败' : '操作成功'"
      :description="notice.message"
      :closable="false"
      class="mb-4"
    />
    <Divider />
    <Form :model="form" :label-width="88">
      <FormItem name="username" label="用户名">
        <Input
          :model-value="form.username || ''"
          placeholder="请输入用户名"
          @update:model-value="(val: string) => setField('username', val)"
          :status="errors?.username ? 'error' : undefined"
          :error-message="errors?.username"
        />
      </FormItem>
      <FormItem name="password" label="密码">
        <Input
          :model-value="form.password || ''"
          type="password"
          placeholder="请输入密码"
          @update:model-value="(val: string) => setField('password', val)"
          :status="errors?.password ? 'error' : undefined"
          :error-message="errors?.password"
        />
      </FormItem>
      <div class="mt-6 flex flex-col gap-3">
        <Button
          variant="primary"
          block
          :loading="loading"
          type="button"
          @click="handleLogin"
        >
          登录
        </Button>
        <Button
          variant="outline"
          block
          type="button"
          @click="$emit('switch', 'register')"
        >
          注册
        </Button>
      </div>
    </Form>
  </Card>
</template>
