<script setup lang="ts">
import { Alert, Button, Card, Divider, Form, FormItem, Input, Space } from '@expcat/tigercat-vue'
import { type AuthForm, type AuthErrors } from '../utils'

interface Notice {
  type: 'success' | 'error' | '';
  message: string;
}

const props = defineProps<{
  form: AuthForm;
  errors?: AuthErrors;
  loading: boolean;
  notice: Notice;
}>()

const emit = defineEmits<{
  (e: 'submit'): void;
  (e: 'switch', key: string): void;
  (e: 'update-field', field: keyof AuthForm, value: string): void;
}>()
</script>

<template>
  <Card title="Tigercat Admin 登录" class="max-w-xl mx-auto">
    <Alert
      v-if="notice.message"
      :type="notice.type"
      :title="notice.type === 'error' ? '操作失败' : '操作成功'"
      :description="notice.message"
      :closable="false"
    />
    <Divider />
    <Form :model="form" :label-width="88">
      <FormItem prop="username" label="用户名">
        <Input
          :model-value="form.username"
          placeholder="请输入用户名"
          :status="errors?.username ? 'error' : ''"
          :errorMessage="errors?.username"
          @update:modelValue="(val) => emit('update-field', 'username', val)"
        />
      </FormItem>
      <FormItem prop="password" label="密码">
        <Input
          :model-value="form.password"
          type="password"
          placeholder="请输入密码"
          :status="errors?.password ? 'error' : ''"
          :errorMessage="errors?.password"
          @update:modelValue="(val) => emit('update-field', 'password', val)"
        />
      </FormItem>
      <div class="mt-6 flex flex-col gap-3">
        <Button variant="primary" block :loading="loading" type="button" @click="emit('submit')">登录</Button>
        <Button variant="outline" block type="button" @click="emit('switch', 'register')">没有账号？去注册</Button>
      </div>
    </Form>
  </Card>
</template>
