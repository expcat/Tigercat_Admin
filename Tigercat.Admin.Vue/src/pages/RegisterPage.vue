<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { Button, Card, Divider, Form, FormItem, Input, Message } from '@expcat/tigercat-vue'
import { type AuthForm, debounce, useAuthForm, apiRequest } from '../utils'

interface RegisterResult {
  username: string;
}

const emit = defineEmits<{
  (e: 'switch', key: string): void;
}>()

const { form, errors, setField, validateForm } = useAuthForm({ username: '', password: '' })
const loading = ref(false)
const registerNoticeDuration = 3
const registerRedirectTimer = ref<number | null>(null)

const clearRegisterRedirectTimer = () => {
  if (registerRedirectTimer.value) {
    window.clearTimeout(registerRedirectTimer.value)
    registerRedirectTimer.value = null
  }
}

onBeforeUnmount(() => {
  clearRegisterRedirectTimer()
})

const handleRegister = debounce(async () => {
  if (!validateForm()) return

  loading.value = true
  try {
    const payload = await apiRequest<RegisterResult>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(form.value),
    })
    const message = `用户 ${payload?.data?.username || form.value.username} 注册成功`
    clearRegisterRedirectTimer()
    
    Message.success({
      content: message,
      duration: registerNoticeDuration * 1000
    })

    registerRedirectTimer.value = window.setTimeout(() => {
      emit('switch', 'login')
    }, registerNoticeDuration * 1000)
  } catch (error: any) {
    clearRegisterRedirectTimer()
    Message.error({
      content: error.message,
      duration: registerNoticeDuration * 1000
    })
  } finally {
    loading.value = false
  }
}, 300)
</script>

<template>
  <Card title="Tigercat Admin 注册" class="max-w-xl mx-auto">
    <Divider />
    <Form :model="form" :label-width="88">
      <FormItem prop="username" label="用户名">
        <Input
          :model-value="form.username"
          placeholder="请输入用户名"
          :status="errors?.username ? 'error' : ''"
          :errorMessage="errors?.username"
          @update:modelValue="(val) => setField('username', val)"
        />
      </FormItem>
      <FormItem prop="password" label="密码">
        <Input
          :model-value="form.password"
          type="password"
          placeholder="请输入密码"
          :status="errors?.password ? 'error' : ''"
          :errorMessage="errors?.password"
          @update:modelValue="(val) => setField('password', val)"
        />
      </FormItem>
      <div class="mt-6 flex flex-col gap-3">
        <Button variant="primary" block :loading="loading" type="button" @click="handleRegister">注册</Button>
        <Button variant="outline" block type="button" @click="emit('switch', 'login')">已有账号？去登录</Button>
      </div>
    </Form>
  </Card>
</template>
