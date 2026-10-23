import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@expcat/tigercat-react/Button';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Pagination } from '@expcat/tigercat-react/Pagination';
import { Card } from '@expcat/tigercat-react/Card';
import { Message } from '@expcat/tigercat-react/Message';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import { Segmented } from '@expcat/tigercat-react/Segmented';
import { Image } from '@expcat/tigercat-react/Image';
import { ImageGroup } from '@expcat/tigercat-react/ImageGroup';
import { ImagePreview } from '@expcat/tigercat-react/ImagePreview';
import type { ImageCropperRef } from '@expcat/tigercat-react/ImageCropper';
import { ImageAnnotation, ImageCropper } from '../utils/lazyTigercat';
import { Carousel } from '@expcat/tigercat-react/Carousel';
import { Masonry } from '@expcat/tigercat-react/Masonry';
import { AspectRatio } from '@expcat/tigercat-react/AspectRatio';
import { ImageCompare } from '@expcat/tigercat-react/ImageCompare';
import { Empty } from '@expcat/tigercat-react/Empty';
import { Skeleton } from '@expcat/tigercat-react/Skeleton';
import { Drawer } from '@expcat/tigercat-react/Drawer';
import type { ImageAnnotation as ImageAnnotationItem } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { ImageIcon, ActivityIcon } from '../components/Icons';

import { useNavigate } from 'react-router-dom';
import { usePermission } from '../utils/permission';
import { gallerySampleFile, getMediaDetail, listMedia, saveMediaAnnotations, uploadOrReuseMedia } from '../utils/media';
import type { AlbumKey, GalleryImage } from '../utils/types';

const ALBUM_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '产品', value: 'product' },
  { label: '团队', value: 'team' },
  { label: '已保存', value: 'media' },
  { label: '空相册', value: 'empty' },
];

function makePlaceholder(label: string, hue: number, w = 480, h = 320): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="hsl(${hue},72%,56%)"/><stop offset="100%" stop-color="hsl(${(hue + 40) % 360},70%,42%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" fill="rgba(255,255,255,0.92)" font-family="system-ui,sans-serif" font-size="30" font-weight="600" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const IMAGES: GalleryImage[] = [
  { id: 'p1', title: '产品概览', album: 'product', hue: 210 },
  { id: 'p2', title: '仪表盘截图', album: 'product', hue: 250 },
  { id: 'p3', title: '移动端预览', album: 'product', hue: 285 },
  { id: 'p4', title: '主题配色', album: 'product', hue: 20 },
  { id: 't1', title: '团队合影', album: 'team', hue: 150 },
  { id: 't2', title: '线下沙龙', album: 'team', hue: 175 },
  { id: 't3', title: '协作白板', album: 'team', hue: 120 },
];

const MASONRY_COLUMNS = { xs: 1, sm: 2, lg: 3 };
const ASPECT_RATIOS = ['16/9', '4/3', '1/1'] as const;

const srcOf = (img: GalleryImage) => img.media?.url ?? makePlaceholder(img.title, img.hue);

function aspectRatioOf(img: GalleryImage): (typeof ASPECT_RATIOS)[number] {
  const index = IMAGES.findIndex((item) => item.id === img.id);
  return ASPECT_RATIOS[(index < 0 ? 0 : index) % ASPECT_RATIOS.length];
}

const compareBeforeSrc = makePlaceholder('改版前', 210);
const compareAfterSrc = makePlaceholder('改版后', 20);

function GalleryPage() {
  const navigate = useNavigate();
  const { has } = usePermission();
  const canView = has('media:view');
  const canUpload = has('media:upload');
  const [album, setAlbum] = useState<AlbumKey>('all');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [mediaImages, setMediaImages] = useState<GalleryImage[]>([]);
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaTotal, setMediaTotal] = useState(0);
  const [reload, setReload] = useState(0);
  const annotationController = useRef<AbortController | null>(null);
  const refresh = () => setReload((value) => value + 1);
  useEffect(() => {
    if (!canView) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    void listMedia({ page: mediaPage, pageSize: 12, contentType: 'image/', sortOrder: 'desc' }, controller.signal)
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setMediaImages(data.items.map((media) => ({ id: `media-${media.id}`, title: media.originalFileName, album: 'media', hue: 210, media })));
        setMediaTotal(data.total);
      }).catch((error) => { if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : '图库加载失败'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [canView, mediaPage, reload]);
  useEffect(() => () => annotationController.current?.abort(), []);

  const filtered = useMemo<GalleryImage[]>(() => {
    if (album === 'empty') return [];
    const images = [...IMAGES, ...mediaImages];
    return album === 'all' ? images : images.filter((image) => image.album === album);
  }, [album, mediaImages]);
  const filteredSrcs = useMemo(() => filtered.map(srcOf), [filtered]);
  const featured = useMemo(() => IMAGES.slice(0, 4), []);

  // 大图查看
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  // 幻灯片预览
  const [previewOpen, setPreviewOpen] = useState(false);
  const openSlideshow = () => {
    if (!filteredSrcs.length) {
      Message.info({ content: '当前相册暂无图片', duration: 1800 });
      return;
    }
    setPreviewOpen(true);
  };

  const [annotateOpen, setAnnotateOpen] = useState(false);
  const [annotateImage, setAnnotateImage] = useState<GalleryImage | null>(null);
  const [annotations, setAnnotations] = useState<ImageAnnotationItem[]>([]);
  const [annotationLoading, setAnnotationLoading] = useState(false);
  const [annotationSaving, setAnnotationSaving] = useState(false);
  const [annotationError, setAnnotationError] = useState('');
  const [annotationSaveError, setAnnotationSaveError] = useState('');
  const [annotationMediaId, setAnnotationMediaId] = useState<number | null>(null);
  const openAnnotate = async (img: GalleryImage) => {
    annotationController.current?.abort();
    const controller = new AbortController();
    annotationController.current = controller;
    setAnnotateImage(img);
    setAnnotationMediaId(img.media?.id ?? null);
    setAnnotations([]);
    setAnnotationError('');
    setAnnotationSaveError('');
    setAnnotateOpen(true);
    setAnnotationLoading(!!img.media);
    if (!img.media) return;
    try {
      const { data } = await getMediaDetail(img.media.id, controller.signal);
      if (!controller.signal.aborted) setAnnotations(data.annotations);
    } catch (error) {
      if (!controller.signal.aborted) setAnnotationError(error instanceof Error ? error.message : '标注加载失败');
    } finally {
      if (!controller.signal.aborted) setAnnotationLoading(false);
    }
  };
  const closeAnnotate = () => {
    if (annotationSaving) return;
    annotationController.current?.abort();
    setAnnotateOpen(false);
  };
  const saveAnnotations = async () => {
    if (!annotateImage || !canUpload || annotationSaving || annotationLoading || annotationError) return;
    setAnnotationSaving(true);
    setAnnotationSaveError('');
    try {
      let id = annotationMediaId;
      if (!id) {
        const file = await gallerySampleFile(srcOf(annotateImage), annotateImage.title);
        const media = await uploadOrReuseMedia(file);
        id = media.id;
        setAnnotationMediaId(id);
      }
      await saveMediaAnnotations(id, annotations);
      Message.success({ content: '标注已保存，刷新后可继续编辑', duration: 2200 });
      setAnnotateOpen(false);
      setAlbum('media');
      setMediaPage(1);
      refresh();
    } catch (error) {
      setAnnotationSaveError(error instanceof Error ? error.message : '标注保存失败，请重试');
    } finally { setAnnotationSaving(false); }
  };

  const [cropOpen, setCropOpen] = useState(false);
  const [cropImage, setCropImage] = useState<GalleryImage | null>(null);
  const [cropReady, setCropReady] = useState(false);
  const [cropSaving, setCropSaving] = useState(false);
  const [cropError, setCropError] = useState('');
  const cropperRef = useRef<ImageCropperRef>(null);
  const openCrop = (img: GalleryImage) => {
    setCropImage(img);
    setCropReady(false);
    setCropError('');
    setCropOpen(true);
  };
  const closeCrop = () => { if (!cropSaving) setCropOpen(false); };
  const applyCrop = async () => {
    if (!cropImage || !cropReady || !canUpload || cropSaving) return;
    setCropSaving(true);
    setCropError('');
    try {
      const result = await cropperRef.current?.getCropResult();
      if (!result) throw new Error('裁剪器尚未就绪');
      const decoded = await createImageBitmap(result.blob);
      const { width, height } = decoded;
      decoded.close();
      await uploadOrReuseMedia(new File([result.blob], `${cropImage.title}-crop.png`, { type: result.blob.type || 'image/png' }));
      Message.success({ content: `裁剪已保存：${width} × ${height} 像素`, duration: 2600 });
      setCropOpen(false);
      setAlbum('media');
      setMediaPage(1);
      refresh();
    } catch (error) {
      setCropError(error instanceof Error ? error.message : '裁剪保存失败，请重试');
    } finally { setCropSaving(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ImageIcon size={24} />}
        title="媒体图库"
        subtitle="图片网格、灯箱预览、大图查看、标注与裁剪——覆盖完整的 Image 组件族"
        tags={[
          { label: '内容管理', variant: 'primary' },
          { label: '演示数据', variant: 'info' },
        ]}
      />

      <Card header={<Text weight="bold">精选轮播</Text>}>
        <Carousel autoplay arrows dots autoplaySpeed={3500}>
          {featured.map((img) => (
            <div key={img.id} className="h-40 w-full sm:h-56">
              <Image src={srcOf(img)} alt={img.title} fit="cover" preview={false} className="h-full w-full" />
            </div>
          ))}
        </Carousel>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented value={album} options={ALBUM_OPTIONS} onChange={(v) => setAlbum(v as AlbumKey)} />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refresh}>
              <span className="mr-1 inline-flex align-middle">
                <ActivityIcon size={16} />
              </span>
              刷新
            </Button>
            <Button onClick={openSlideshow}>
              <span className="mr-1 inline-flex align-middle">
                <ImageIcon size={16} />
              </span>
              幻灯片预览
            </Button>
          </div>
        </div>
      </Card>

      {loadError && <Alert type="error" title="已保存图片加载失败" description={loadError} action={<Button onClick={refresh}>重试</Button>} />}
      {!canView && <Alert type="info" title="当前账号无媒体读取权限，仅展示示例素材" />}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, n) => (
            <Card key={n}>
              <Skeleton variant="image" width="100%" height="160px" />
              <div className="mt-3">
                <Skeleton variant="text" rows={2} />
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length ? (
        <ImageGroup>
          <Masonry columns={MASONRY_COLUMNS} gap={16}>
            {filtered.map((img, index) => (
              <Card key={img.id}>
                <AspectRatio ratio={aspectRatioOf(img)} className="overflow-hidden rounded-lg">
                  <Image src={srcOf(img)} alt={img.title} fit="cover" className="h-full w-full" />
                </AspectRatio>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Text weight="medium" className="block truncate">
                      {img.title}
                    </Text>
                    <Tag size="sm" variant="info">
                      {img.album === 'product' ? '产品' : img.album === 'team' ? '团队' : '已保存'}
                    </Tag>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openViewer(index)}>
                    查看
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openAnnotate(img)}>
                    标注
                  </Button>
                  <Button size="sm" variant="ghost" disabled={!canUpload} onClick={() => openCrop(img)}>
                    裁剪
                  </Button>
                  {img.media && <Button size="sm" variant="ghost" onClick={() => navigate(`/files/${img.media!.id}`)}>媒体详情</Button>}
                </div>
              </Card>
            ))}
          </Masonry>
        </ImageGroup>
      ) : (
        <Card>
          <Empty preset="no-data" description="该相册暂无图片，切换到“产品 / 团队”查看示例素材。" />
        </Card>
      )}

      {canView && (album === 'media' || album === 'all') && <Pagination current={mediaPage} pageSize={12} total={mediaTotal} onChange={setMediaPage} />}
      <Card header={<Text weight="bold">版本对比</Text>}>
        <Text size="sm" color="secondary" className="mb-3 block">
          拖动滑块对比改版前后的产品封面（演示占位图，不接入上传）。
        </Text>
        <ImageCompare
          beforeSrc={compareBeforeSrc}
          afterSrc={compareAfterSrc}
          beforeAlt="改版前"
          afterAlt="改版后"
          fit="cover"
          defaultPosition={50}
          width="100%"
          height={320}
          className="overflow-hidden rounded-lg"
        />
      </Card>

      <ImagePreview
        images={filteredSrcs}
        open={viewerOpen}
        currentIndex={viewerIndex}
        onOpenChange={setViewerOpen}
        onCurrentIndexChange={setViewerIndex}
      />

      <ImagePreview images={filteredSrcs} open={previewOpen} onOpenChange={setPreviewOpen} />

      <Drawer placement="right" open={annotateOpen} title="图片标注" width="560px" mask maskClosable={!annotationSaving} closable={!annotationSaving} onClose={closeAnnotate}>
        {annotateOpen && annotateImage && <div className="space-y-3">
          {annotationError ? <Alert type="error" title={annotationError} action={<Button onClick={() => void openAnnotate(annotateImage)}>重试</Button>} /> : annotationLoading ? <Text>正在读取标注…</Text> :
            <ImageAnnotation src={srcOf(annotateImage)} value={annotations} disabled={annotationSaving} readonly={!canUpload}
              tools={['select', 'rectangle', 'ellipse', 'polygon', 'freehand']} defaultTool="rectangle" onChange={setAnnotations} />}
          <Text size="sm" color="secondary">已标注 {annotations.length} 个区域；保存后可从“已保存”相册恢复。</Text>
          {annotationSaveError && <Alert type="error" title={annotationSaveError} />}
          {!canUpload && <Text color="secondary">当前账号无标注写入权限</Text>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={annotationSaving} onClick={closeAnnotate}>取消</Button>
            <Button disabled={!canUpload || annotationSaving || annotationLoading || !!annotationError} onClick={() => void saveAnnotations()}>{annotationSaving ? '正在保存…' : '保存标注'}</Button>
          </div>
        </div>}
      </Drawer>

      <Drawer placement="right" open={cropOpen} title="图片裁剪" width="560px" mask maskClosable={!cropSaving} closable={!cropSaving} onClose={closeCrop}>
        {cropOpen && cropImage && <div className="space-y-3">
          <div inert={cropSaving}><ImageCropper ref={cropperRef} src={srcOf(cropImage)} aspectRatio={16 / 9}
            onReady={() => setCropReady(true)} onError={(error) => { setCropReady(false); setCropError(error.message); }} /></div>
          {cropError && <Alert type="error" title={cropError} />}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={cropSaving} onClick={closeCrop}>取消</Button>
            <Button disabled={!canUpload || !cropReady || cropSaving} onClick={() => void applyCrop()}>{cropSaving ? '正在保存…' : '应用裁剪'}</Button>
          </div>
        </div>}
      </Drawer>
    </div>
  );
}

export default GalleryPage;
