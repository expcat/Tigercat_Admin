<script setup lang="ts">
import { useAttrs } from 'vue'
import { Container } from '@expcat/tigercat-vue'

const attrs = useAttrs()
</script>

<template>
  <div class="min-h-screen bg-(--tiger-bg-page,#f8fafc) p-4 flex items-center justify-center sm:p-6">
    <Container width="100%" :padding="false" class="w-full max-w-4xl">
      <RouterView v-slot="{ Component }">
        <Suspense>
          <template #default>
            <component :is="Component" v-bind="attrs" />
          </template>
          <template #fallback>
            <div class="flex items-center justify-center h-full min-h-50">
              <div class="p2-text-secondary">加载中...</div>
            </div>
          </template>
        </Suspense>
      </RouterView>
    </Container>
  </div>
</template>
