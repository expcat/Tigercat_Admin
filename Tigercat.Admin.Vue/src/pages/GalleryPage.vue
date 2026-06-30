<script setup lang="ts">
import { computed, ref } from 'vue'
import { Card, Text, Tag, Button, Message } from '@expcat/tigercat-vue'
import { Segmented } from '@expcat/tigercat-vue/Segmented'
import { Image } from '@expcat/tigercat-vue/Image'
import { ImageGroup } from '@expcat/tigercat-vue/ImageGroup'
import { ImagePreview } from '@expcat/tigercat-vue/ImagePreview'
import { ImageViewer } from '@expcat/tigercat-vue/ImageViewer'
import { ImageAnnotation } from '@expcat/tigercat-vue/ImageAnnotation'
import { ImageCropper } from '@expcat/tigercat-vue/ImageCropper'
import { Carousel } from '@expcat/tigercat-vue/Carousel'
import { Empty } from '@expcat/tigercat-vue/Empty'
import { Skeleton } from '@expcat/tigercat-vue/Skeleton'
import { Drawer } from '@expcat/tigercat-vue/Drawer'
import type { ImageAnnotation as ImageAnnotationItem, CropRect } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'

type AlbumKey = 'all' | 'product' | 'team' | 'empty'

const ALBUM_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '产品', value: 'product' },
  { label: '团队', value: 'team' },
  { label: '空相册', value: 'empty' },
]

interface GalleryImage {
  id: string
  title: string
  album: Exclude<AlbumKey, 'all' | 'empty'>
  hue: number
}

function makePlaceholder(label: string, hue: number, w = 480, h = 320): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="hsl(${hue},72%,56%)"/><stop offset="100%" stop-color="hsl(${(hue + 40) % 360},70%,42%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" fill="rgba(255,255,255,0.92)" font-family="system-ui,sans-serif" font-size="30" font-weight="600" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const IMAGES: GalleryImage[] = [
  { id: 'p1', title: '产品概览', album: 'product', hue: 210 },
  { id: 'p2', title: '仪表盘截图', album: 'product', hue: 250 },
  { id: 'p3', title: '移动端预览', album: 'product', hue: 285 },
  { id: 'p4', title: '主题配色', album: 'product', hue: 20 },
  { id: 't1', title: '团队合影', album: 'team', hue: 150 },
  { id: 't2', title: '线下沙龙', album: 'team', hue: 175 },
  { id: 't3', title: '协作白板', album: 'team', hue: 120 },
]

const srcOf = (img: GalleryImage) => makePlaceholder(img.title, img.hue)

const album = ref<AlbumKey>('all')
const loading = ref(false)

const filtered = computed<GalleryImage[]>(() => {
  if (album.value === 'empty') return []
  if (album.value === 'all') return IMAGES
  return IMAGES.filter((i) => i.album === album.value)
})
const filteredSrcs = computed(() => filtered.value.map(srcOf))
const featured = computed(() => IMAGES.slice(0, 4))

function refresh() {
  loading.value = true
  window.setTimeout(() => {
    loading.value = false
    Message.success({ content: '图库已刷新（演示）', duration: 1800 })
  }, 650)
}

// ── 大图查看 ──────────────────────────────────────
const viewerOpen = ref(false)
const viewerIndex = ref(0)
function openViewer(index: number) {
  viewerIndex.value = index
  viewerOpen.value = true
}

// ── 幻灯片预览 ────────────────────────────────────
const previewOpen = ref(false)
function openSlideshow() {
  if (!filteredSrcs.value.length) {
    Message.info({ content: '当前相册暂无图片', duration: 1800 })
    return
  }
  previewOpen.value = true
}

// ── 标注 ──────────────────────────────────────────
const annotateOpen = ref(false)
const annotateSrc = ref('')
const annotations = ref<ImageAnnotationItem[]>([])
function openAnnotate(img: GalleryImage) {
  annotateSrc.value = srcOf(img)
  annotations.value = []
  annotateOpen.value = true
}

// ── 裁剪 ──────────────────────────────────────────
const cropOpen = ref(false)
const cropSrc = ref('')
const cropRect = ref<CropRect | null>(null)
function openCrop(img: GalleryImage) {
  cropSrc.value = srcOf(img)
  cropRect.value = null
  cropOpen.value = true
}
function onCropChange(rect: CropRect) {
  cropRect.value = rect
}
function applyCrop() {
  if (cropRect.value) {
    const { width, height } = cropRect.value
    Message.success({
      content: `已裁剪区域 ${Math.round(width)} × ${Math.round(height)}（演示）`,
      duration: 2200,
    })
  }
  cropOpen.value = false
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      icon="image"
      title="媒体图库"
      subtitle="图片网格、灯箱预览、大图查看、标注与裁剪——覆盖完整的 Image 组件族"
      :tags="[
        { label: '内容管理', variant: 'primary' },
        { label: '演示数据', variant: 'info' },
      ]"
    />

    <Card>
      <template #header><Text weight="bold">精选轮播</Text></template>
      <Carousel :autoplay="true" :arrows="true" :dots="true" :autoplay-speed="3500">
        <div v-for="img in featured" :key="img.id" class="h-56 w-full sm:h-72">
          <Image
            :src="srcOf(img)"
            :alt="img.title"
            fit="cover"
            :preview="false"
            class="h-full w-full"
          />
        </div>
      </Carousel>
    </Card>

    <Card>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented v-model="album" :options="ALBUM_OPTIONS" />
        <div class="flex items-center gap-2">
          <Button variant="outline" @click="refresh">
            <Icon name="activity" :size="16" class="mr-1" />
            刷新
          </Button>
          <Button @click="openSlideshow">
            <Icon name="image" :size="16" class="mr-1" />
            幻灯片预览
          </Button>
        </div>
      </div>
    </Card>

    <!-- 加载骨架 -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="n in 6" :key="n">
        <Skeleton variant="image" width="100%" height="160px" />
        <div class="mt-3">
          <Skeleton variant="text" :rows="2" />
        </div>
      </Card>
    </div>

    <!-- 图片网格 -->
    <ImageGroup v-else-if="filtered.length">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card v-for="(img, index) in filtered" :key="img.id">
          <div class="h-40 w-full overflow-hidden rounded-lg">
            <Image :src="srcOf(img)" :alt="img.title" fit="cover" class="h-full w-full" />
          </div>
          <div class="mt-3 flex items-center justify-between gap-2">
            <div class="min-w-0">
              <Text weight="medium" class="truncate block">{{ img.title }}</Text>
              <Tag size="sm" variant="info">{{ img.album === 'product' ? '产品' : '团队' }}</Tag>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" @click="openViewer(index)">查看</Button>
            <Button size="sm" variant="outline" @click="openAnnotate(img)">标注</Button>
            <Button size="sm" variant="outline" @click="openCrop(img)">裁剪</Button>
          </div>
        </Card>
      </div>
    </ImageGroup>

    <!-- 空相册 -->
    <Card v-else>
      <Empty preset="no-data" description="该相册暂无图片，切换到“产品 / 团队”查看示例素材。" />
    </Card>

    <!-- 大图查看 -->
    <ImageViewer
      :images="filteredSrcs"
      :open="viewerOpen"
      :current-index="viewerIndex"
      @update:open="(v: boolean) => (viewerOpen = v)"
      @update:current-index="(v: number) => (viewerIndex = v)"
      @close="viewerOpen = false"
    />

    <!-- 幻灯片预览 -->
    <ImagePreview
      :images="filteredSrcs"
      :open="previewOpen"
      @update:open="(v: boolean) => (previewOpen = v)"
    />

    <!-- 标注 -->
    <Drawer
      placement="right"
      :open="annotateOpen"
      title="图片标注"
      width="560px"
      :mask="true"
      :mask-closable="true"
      @update:open="(v: boolean) => (annotateOpen = v)"
      @close="annotateOpen = false"
    >
      <div v-if="annotateOpen" class="space-y-3">
        <ImageAnnotation
          v-model="annotations"
          :src="annotateSrc"
          :tools="['select', 'rectangle', 'ellipse']"
          default-tool="rectangle"
        />
        <Text size="sm" color="secondary">
          已标注 {{ annotations.length }} 个区域（演示，刷新后重置）。
        </Text>
      </div>
    </Drawer>

    <!-- 裁剪 -->
    <Drawer
      placement="right"
      :open="cropOpen"
      title="图片裁剪"
      width="560px"
      :mask="true"
      :mask-closable="true"
      @update:open="(v: boolean) => (cropOpen = v)"
      @close="cropOpen = false"
    >
      <div v-if="cropOpen" class="space-y-3">
        <ImageCropper :src="cropSrc" :aspect-ratio="16 / 9" @crop-change="onCropChange" />
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="cropOpen = false">取消</Button>
          <Button @click="applyCrop">应用裁剪</Button>
        </div>
      </div>
    </Drawer>
  </div>
</template>
