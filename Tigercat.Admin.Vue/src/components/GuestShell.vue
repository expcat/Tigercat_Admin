<script setup lang="ts">
import { useAttrs } from 'vue'
import { Container } from '@expcat/tigercat-vue'

const attrs = useAttrs()
</script>

<template>
  <div class="min-h-screen bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100 p-6 flex items-center justify-center">
    <Container width="100%" :padding="false" class="w-full max-w-4xl">
      <RouterView v-slot="{ Component }">
        <Suspense>
          <template #default>
            <component :is="Component" v-bind="attrs" />
          </template>
          <template #fallback>
            <div class="flex items-center justify-center h-full min-h-50">
              <div class="text-slate-500">加载中...</div>
            </div>
          </template>
        </Suspense>
      </RouterView>
    </Container>
  </div>
</template>
