<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Button } from '@expcat/tigercat-vue/Button'
import { Alert } from '@expcat/tigercat-vue/Alert'
import { Pagination } from '@expcat/tigercat-vue/Pagination'
import { Card } from '@expcat/tigercat-vue/Card'
import { Message } from '@expcat/tigercat-vue/Message'
import { Tag } from '@expcat/tigercat-vue/Tag'
import { Text } from '@expcat/tigercat-vue/Text'
import { Segmented } from '@expcat/tigercat-vue/Segmented'
import { Image } from '@expcat/tigercat-vue/Image'
import { ImageGroup } from '@expcat/tigercat-vue/ImageGroup'
import { ImagePreview } from '@expcat/tigercat-vue/ImagePreview'
import { ImageAnnotation, ImageCropper } from '../utils/lazyTigercat'
import { Carousel } from '@expcat/tigercat-vue/Carousel'
import { Masonry } from '@expcat/tigercat-vue/Masonry'
import { AspectRatio } from '@expcat/tigercat-vue/AspectRatio'
import { ImageCompare } from '@expcat/tigercat-vue/ImageCompare'
import { Empty } from '@expcat/tigercat-vue/Empty'
import { Skeleton } from '@expcat/tigercat-vue/Skeleton'
import { Drawer } from '@expcat/tigercat-vue/Drawer'
import type { ImageAnnotation as ImageAnnotationItem, CropResult } from '@expcat/tigercat-core'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'

import { useRouter } from 'vue-router'
import { usePermission } from '../utils/permission'
import { gallerySampleFile, getMediaDetail, listMedia, saveMediaAnnotations, uploadOrReuseMedia } from '../utils/media'
import type { AlbumKey, GalleryImage } from '../utils/types'

const ALBUM_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '产品', value: 'product' },
  { label: '团队', value: 'team' },
  { label: '已保存', value: 'media' },
  { label: '空相册', value: 'empty' },
]

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

const MASONRY_COLUMNS = { xs: 1, sm: 2, lg: 3 }
const ASPECT_RATIOS = ['16/9', '4/3', '1/1'] as const

const srcOf = (img: GalleryImage) => img.media?.url ?? makePlaceholder(img.title, img.hue)

function aspectRatioOf(img: GalleryImage): (typeof ASPECT_RATIOS)[number] {
  const index = IMAGES.findIndex((item) => item.id === img.id)
  return ASPECT_RATIOS[(index < 0 ? 0 : index) % ASPECT_RATIOS.length]
}

const compareBeforeSrc = makePlaceholder('改版前', 210)
const compareAfterSrc = makePlaceholder('改版后', 20)

const router = useRouter()
const { has } = usePermission()
const canView = computed(() => has('media:view'))
const canUpload = computed(() => has('media:upload'))
const album = ref<AlbumKey>('all')
const loading = ref(false)
const loadError = ref('')
const mediaImages = ref<GalleryImage[]>([])
const mediaPage = ref(1)
const mediaTotal = ref(0)
let mediaController: AbortController | null = null
let annotationController: AbortController | null = null

async function refresh() {
  if (!canView.value) return
  mediaController?.abort()
  const controller = new AbortController()
  mediaController = controller
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await listMedia({ page: mediaPage.value, pageSize: 12, contentType: 'image/', sortOrder: 'desc' }, controller.signal)
    if (controller.signal.aborted) return
    mediaImages.value = data.items.map((media) => ({ id: `media-${media.id}`, title: media.originalFileName, album: 'media', hue: 210, media }))
    mediaTotal.value = data.total
  } catch (error) {
    if (!controller.signal.aborted) loadError.value = error instanceof Error ? error.message : '图库加载失败'
  } finally { if (!controller.signal.aborted) loading.value = false }
}
watch([canView, mediaPage], () => void refresh(), { immediate: true })
onBeforeUnmount(() => { mediaController?.abort(); annotationController?.abort() })

const filtered = computed<GalleryImage[]>(() => {
  if (album.value === 'empty') return []
  const images = [...IMAGES, ...mediaImages.value]
  return album.value === 'all' ? images : images.filter((image) => image.album === album.value)
})
const filteredSrcs = computed(() => filtered.value.map(srcOf))
const featured = computed(() => IMAGES.slice(0, 4))

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

const annotateOpen = ref(false)
const annotateImage = ref<GalleryImage | null>(null)
const annotations = ref<ImageAnnotationItem[]>([])
const annotationLoading = ref(false)
const annotationSaving = ref(false)
const annotationError = ref('')
const annotationSaveError = ref('')
const annotationMediaId = ref<number | null>(null)
async function openAnnotate(img: GalleryImage) {
  annotationController?.abort()
  const controller = new AbortController()
  annotationController = controller
  annotateImage.value = img
  annotationMediaId.value = img.media?.id ?? null
  annotations.value = []
  annotationError.value = ''
  annotationSaveError.value = ''
  annotateOpen.value = true
  annotationLoading.value = !!img.media
  if (!img.media) return
  try {
    const { data } = await getMediaDetail(img.media.id, controller.signal)
    if (!controller.signal.aborted) annotations.value = data.annotations
  } catch (error) {
    if (!controller.signal.aborted) annotationError.value = error instanceof Error ? error.message : '标注加载失败'
  } finally { if (!controller.signal.aborted) annotationLoading.value = false }
}
function closeAnnotate() {
  if (annotationSaving.value) return
  annotationController?.abort()
  annotateOpen.value = false
}
async function saveAnnotations() {
  if (!annotateImage.value || !canUpload.value || annotationSaving.value || annotationLoading.value || annotationError.value) return
  annotationSaving.value = true
  annotationSaveError.value = ''
  try {
    let id = annotationMediaId.value
    if (!id) {
      const file = await gallerySampleFile(srcOf(annotateImage.value), annotateImage.value.title)
      const media = await uploadOrReuseMedia(file)
      id = media.id
      annotationMediaId.value = id
    }
    await saveMediaAnnotations(id, annotations.value)
    Message.success({ content: '标注已保存，刷新后可继续编辑', duration: 2200 })
    annotateOpen.value = false
    album.value = 'media'
    mediaPage.value = 1
    void refresh()
  } catch (error) {
    annotationSaveError.value = error instanceof Error ? error.message : '标注保存失败，请重试'
  } finally { annotationSaving.value = false }
}

const cropOpen = ref(false)
const cropImage = ref<GalleryImage | null>(null)
const cropReady = ref(false)
const cropSaving = ref(false)
const cropError = ref('')
const cropperRef = ref<{ getCropResult: () => Promise<CropResult> } | null>(null)
function openCrop(img: GalleryImage) {
  cropImage.value = img
  cropReady.value = false
  cropError.value = ''
  cropOpen.value = true
}
function closeCrop() { if (!cropSaving.value) cropOpen.value = false }
async function applyCrop() {
  if (!cropImage.value || !cropReady.value || !canUpload.value || cropSaving.value) return
  cropSaving.value = true
  cropError.value = ''
  try {
    const result = await cropperRef.value?.getCropResult()
    if (!result) throw new Error('裁剪器尚未就绪')
    const decoded = await createImageBitmap(result.blob)
    const { width, height } = decoded
    decoded.close()
    await uploadOrReuseMedia(new File([result.blob], `${cropImage.value.title}-crop.png`, { type: result.blob.type || 'image/png' }))
    Message.success({ content: `裁剪已保存：${width} × ${height} 像素`, duration: 2600 })
    cropOpen.value = false
    album.value = 'media'
    mediaPage.value = 1
    void refresh()
  } catch (error) {
    cropError.value = error instanceof Error ? error.message : '裁剪保存失败，请重试'
  } finally { cropSaving.value = false }
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
        <div v-for="img in featured" :key="img.id" class="h-40 w-full sm:h-56">
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

    <Alert v-if="loadError" type="error" title="已保存图片加载失败" :description="loadError"><template #action><Button @click="refresh">重试</Button></template></Alert>
    <Alert v-if="!canView" type="info" title="当前账号无媒体读取权限，仅展示示例素材" />
    <!-- 加载骨架 -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="n in 6" :key="n">
        <Skeleton variant="image" width="100%" height="160px" />
        <div class="mt-3">
          <Skeleton variant="text" :rows="2" />
        </div>
      </Card>
    </div>

    <!-- 图片瀑布流 -->
    <ImageGroup v-else-if="filtered.length">
      <Masonry :columns="MASONRY_COLUMNS" :gap="16">
        <Card v-for="(img, index) in filtered" :key="img.id">
          <AspectRatio :ratio="aspectRatioOf(img)" fit="cover" class-name="rounded-lg">
            <Image :src="srcOf(img)" :alt="img.title" fit="cover" class="h-full w-full" />
          </AspectRatio>
          <div class="mt-3 flex items-center justify-between gap-2">
            <div class="min-w-0">
              <Text weight="medium" class="truncate block">{{ img.title }}</Text>
              <Tag size="sm" variant="info">{{ img.album === 'product' ? '产品' : img.album === 'team' ? '团队' : '已保存' }}</Tag>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" @click="openViewer(index)">查看</Button>
            <Button size="sm" variant="ghost" @click="openAnnotate(img)">标注</Button>
            <Button size="sm" variant="ghost" :disabled="!canUpload" @click="openCrop(img)">裁剪</Button>
            <Button v-if="img.media" size="sm" variant="ghost" @click="router.push(`/files/${img.media.id}`)">媒体详情</Button>
          </div>
        </Card>
      </Masonry>
    </ImageGroup>

    <!-- 空相册 -->
    <Card v-else>
      <Empty preset="no-data" description="该相册暂无图片，切换到“产品 / 团队”查看示例素材。" />
    </Card>

    <Pagination v-if="canView && (album === 'media' || album === 'all')" :current="mediaPage" :page-size="12" :total="mediaTotal" @change="(page: number) => mediaPage = page" />
    <Card>
      <template #header><Text weight="bold">版本对比</Text></template>
      <Text size="sm" color="secondary" class="mb-3 block">
        拖动滑块对比改版前后的产品封面（演示占位图，不接入上传）。
      </Text>
      <ImageCompare
        :before-src="compareBeforeSrc"
        :after-src="compareAfterSrc"
        before-alt="改版前"
        after-alt="改版后"
        fit="cover"
        :default-position="50"
        width="100%"
        :height="320"
        class-name="overflow-hidden rounded-lg"
      />
    </Card>

    <!-- 大图查看 -->
    <ImagePreview
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

    <Drawer placement="right" :open="annotateOpen" title="图片标注" width="560px" mask :mask-closable="!annotationSaving" :closable="!annotationSaving" @close="closeAnnotate">
      <div v-if="annotateOpen && annotateImage" class="space-y-3">
        <Alert v-if="annotationError" type="error" :title="annotationError"><template #action><Button @click="openAnnotate(annotateImage)">重试</Button></template></Alert>
        <Text v-else-if="annotationLoading">正在读取标注…</Text>
        <ImageAnnotation v-else v-model="annotations" :src="srcOf(annotateImage)" :disabled="annotationSaving" :readonly="!canUpload"
          :tools="['select', 'rectangle', 'ellipse', 'polygon', 'freehand']" default-tool="rectangle" />
        <Text size="sm" color="secondary">已标注 {{ annotations.length }} 个区域；保存后可从“已保存”相册恢复。</Text>
        <Alert v-if="annotationSaveError" type="error" :title="annotationSaveError" />
        <Text v-if="!canUpload" color="secondary">当前账号无标注写入权限</Text>
        <div class="flex justify-end gap-2">
          <Button variant="outline" :disabled="annotationSaving" @click="closeAnnotate">取消</Button>
          <Button :disabled="!canUpload || annotationSaving || annotationLoading || !!annotationError" @click="saveAnnotations">{{ annotationSaving ? '正在保存…' : '保存标注' }}</Button>
        </div>
      </div>
    </Drawer>
    <Drawer placement="right" :open="cropOpen" title="图片裁剪" width="560px" mask :mask-closable="!cropSaving" :closable="!cropSaving" @close="closeCrop">
      <div v-if="cropOpen && cropImage" class="space-y-3">
        <div :inert="cropSaving"><ImageCropper ref="cropperRef" :src="srcOf(cropImage)" :aspect-ratio="16 / 9"
          @ready="cropReady = true" @error="(error: Error) => { cropReady = false; cropError = error.message }" /></div>
        <Alert v-if="cropError" type="error" :title="cropError" />
        <div class="flex justify-end gap-2">
          <Button variant="outline" :disabled="cropSaving" @click="closeCrop">取消</Button>
          <Button :disabled="!canUpload || !cropReady || cropSaving" @click="applyCrop">{{ cropSaving ? '正在保存…' : '应用裁剪' }}</Button>
        </div>
      </div>
    </Drawer>
  </div>
</template>
