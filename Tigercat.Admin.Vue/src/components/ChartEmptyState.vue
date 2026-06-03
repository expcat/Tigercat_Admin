<script setup lang="ts">
import { Empty } from '@expcat/tigercat-vue'

withDefaults(defineProps<{
  description: string
  heightClass?: string
}>(), {
  heightClass: 'h-52'
})
</script>

<template>
  <div class="flex items-center justify-center" :class="heightClass">
    <Empty :description="description" :show-image="false" />
  </div>
</template>
