<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Button } from '@expcat/tigercat-vue/Button'
import { Card } from '@expcat/tigercat-vue/Card'
import { CopyButton } from '@expcat/tigercat-vue/CopyButton'
import { Image } from '@expcat/tigercat-vue/Image'
import { Message } from '@expcat/tigercat-vue/Message'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import PageHeader from '../components/PageHeader.vue'
import { ImageAnnotation } from '../utils/lazyTigercat'
import { formatMediaBytes, getMediaDetail } from '../utils/media'
import { ApiError } from '../utils/request'
import type { MediaDetail } from '../utils/types'

const route = useRoute()
const router = useRouter()
const detail = ref<MediaDetail | null>(null)
const loading = ref(true)
const error = ref('')
const status = ref(0)
const validId = ref(false)
const detailUrl = ref(window.location.href)
let controller: AbortController | null = null
async function loadDetail() {
  controller?.abort()
  const current = new AbortController()
  controller = current
  detail.value = null
  error.value = ''
  status.value = 0
  detailUrl.value = window.location.href
  const id = String(route.params.id ?? '')
  validId.value = /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))
  if (!validId.value) { status.value = 404; error.value = '媒体资源不存在'; loading.value = false; return }
  loading.value = true
  try {
    const { data } = await getMediaDetail(Number(id), current.signal)
    if (!current.signal.aborted) detail.value = data
  } catch (failure) {
    if (current.signal.aborted) return
    status.value = failure instanceof ApiError ? failure.status : 0
    error.value = failure instanceof Error ? failure.message : '媒体详情加载失败'
  } finally { if (!current.signal.aborted) loading.value = false }
}
watch(() => route.params.id, () => void loadDetail(), { immediate: true })
onBeforeUnmount(() => controller?.abort())
function onCopy(ok: boolean) {
  if (ok) Message.success({ content: 'URL 已复制', duration: 1800 })
  else Message.error({ content: '复制失败，请重试', duration: 2200 })
}
function absoluteUrl(url: string) { return new URL(url, window.location.origin).href }
function openResource(url: string) { window.open(url, '_blank', 'noopener,noreferrer') }
</script>

<template>
  <div class="space-y-6">
    <PageHeader icon="fileText" title="媒体详情" :subtitle="detail?.originalFileName ?? '查看媒体元数据、图片标注与引用来源'" :tags="[{ label: '媒体资源', variant: 'primary' }]" />
    <Button variant="outline" @click="router.push('/files')">返回文件管理</Button>
    <Card v-if="loading"><Text>正在加载媒体详情…</Text></Card>
    <Alert v-else-if="error" type="error" :title="status === 404 ? '媒体资源不存在' : status === 403 ? '无权查看媒体' : '媒体详情加载失败'" :description="error">
      <template #action><Button v-if="validId && status !== 404" @click="loadDetail">重试</Button></template>
    </Alert>
    <template v-else-if="detail">
      <Card>
        <div v-if="detail.contentType.startsWith('image/')" class="mb-4 overflow-hidden rounded border border-(--tiger-border) bg-(--tiger-bg-page)">
          <ImageAnnotation v-if="detail.annotations.length" :src="detail.url" :alt="detail.originalFileName" :model-value="detail.annotations" readonly :tools="['select']" />
          <Image v-else :src="detail.url" :alt="detail.originalFileName" fit="contain" class="max-h-96 w-full" />
        </div>
        <Text v-else class="mb-4 block" color="secondary">此文件没有图片预览，可打开资源查看或下载。</Text>
        <dl class="grid min-w-0 gap-4 text-sm sm:grid-cols-2">
          <div><dt class="p2-text-secondary">文件名</dt><dd class="break-all">{{ detail.originalFileName }}</dd></div>
          <div><dt class="p2-text-secondary">大小</dt><dd>{{ formatMediaBytes(detail.sizeBytes) }}</dd></div>
          <div><dt class="p2-text-secondary">类型</dt><dd class="break-all">{{ detail.contentType }}</dd></div>
          <div><dt class="p2-text-secondary">存储提供方</dt><dd>{{ detail.storageProvider }}</dd></div>
          <div><dt class="p2-text-secondary">尺寸</dt><dd>{{ detail.width && detail.height ? `${detail.width} × ${detail.height} 像素` : '未识别' }}</dd></div>
          <div><dt class="p2-text-secondary">上传人</dt><dd>{{ detail.uploadedBy || '未知' }}</dd></div>
          <div><dt class="p2-text-secondary">上传时间</dt><dd>{{ new Date(detail.createdAt).toLocaleString('zh-CN') }}</dd></div>
          <div><dt class="p2-text-secondary">已保存标注</dt><dd>{{ detail.annotations.length }} 个区域</dd></div>
          <div class="sm:col-span-2"><dt class="p2-text-secondary">SHA256</dt><dd class="break-all">{{ detail.sha256Hash || '未记录' }}</dd></div>
          <div class="min-w-0 sm:col-span-2"><dt class="p2-text-secondary">资源 URL</dt><dd class="line-clamp-3 break-all">{{ detail.url }}</dd></div>
        </dl>
        <div class="mt-4 flex flex-wrap gap-2">
          <CopyButton :text="absoluteUrl(detail.url)" label="复制 URL" @copy="onCopy" />
          <CopyButton :text="detailUrl" label="复制详情链接" @copy="onCopy" />
          <Button variant="outline" @click="openResource(detail.url)">打开资源</Button>
        </div>
      </Card>
      <Card>
        <template #header><Text weight="bold">引用来源（{{ detail.references.length }}）</Text></template>
        <Text v-if="!detail.references.length" color="secondary">暂无引用</Text>
        <ul v-else class="space-y-2"><li v-for="reference in detail.references" :key="reference.id" class="flex flex-wrap items-center gap-2 break-all">
          <Tag variant="primary" size="sm">{{ reference.referenceType }}</Tag><span>{{ reference.displayName || reference.referenceKey }}</span>
        </li></ul>
      </Card>
    </template>
  </div>
</template>
