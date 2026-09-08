<script setup lang="ts">
import { Footer } from '@expcat/tigercat-vue/Footer'
import { Icon } from '@expcat/tigercat-vue/Icon'
import { Space } from '@expcat/tigercat-vue/Space'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
</script>

<template>
  <Footer
    data-testid="shell-footer"
    class="mt-8 border-t border-(--tiger-border,#e2e8f0) bg-transparent px-0 py-4"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Space size="sm" align="center" wrap>
        <Icon name="dashboard" size="sm" />
        <Text size="sm" color="secondary">Tigercat Admin</Text>
        <Tag size="sm" variant="default">UI 2.3.2</Tag>
      </Space>
      <Text size="sm" color="secondary">演示蓝本 · 非生产数据</Text>
    </div>
  </Footer>
</template>
