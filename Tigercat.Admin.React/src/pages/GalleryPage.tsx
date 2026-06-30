import { useMemo, useRef, useState } from 'react';
import { Card, Text, Tag, Button, Message } from '@expcat/tigercat-react';
import { Segmented } from '@expcat/tigercat-react/Segmented';
import { Image } from '@expcat/tigercat-react/Image';
import { ImageGroup } from '@expcat/tigercat-react/ImageGroup';
import { ImagePreview } from '@expcat/tigercat-react/ImagePreview';
import { ImageViewer } from '@expcat/tigercat-react/ImageViewer';
import { ImageAnnotation } from '@expcat/tigercat-react/ImageAnnotation';
import { ImageCropper, type ImageCropperRef } from '@expcat/tigercat-react/ImageCropper';
import { Carousel } from '@expcat/tigercat-react/Carousel';
import { Empty } from '@expcat/tigercat-react/Empty';
import { Skeleton } from '@expcat/tigercat-react/Skeleton';
import { Drawer } from '@expcat/tigercat-react/Drawer';
import type { ImageAnnotation as ImageAnnotationItem } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import { ImageIcon, ActivityIcon } from '../components/Icons';

type AlbumKey = 'all' | 'product' | 'team' | 'empty';

const ALBUM_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '产品', value: 'product' },
  { label: '团队', value: 'team' },
  { label: '空相册', value: 'empty' },
];

interface GalleryImage {
  id: string;
  title: string;
  album: Exclude<AlbumKey, 'all' | 'empty'>;
  hue: number;
}

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

const srcOf = (img: GalleryImage) => makePlaceholder(img.title, img.hue);

function GalleryPage() {
  const [album, setAlbum] = useState<AlbumKey>('all');
  const [loading, setLoading] = useState(false);

  const filtered = useMemo<GalleryImage[]>(() => {
    if (album === 'empty') return [];
    if (album === 'all') return IMAGES;
    return IMAGES.filter((i) => i.album === album);
  }, [album]);
  const filteredSrcs = useMemo(() => filtered.map(srcOf), [filtered]);
  const featured = useMemo(() => IMAGES.slice(0, 4), []);

  const refresh = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      Message.success({ content: '图库已刷新（演示）', duration: 1800 });
    }, 650);
  };

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

  // 标注
  const [annotateOpen, setAnnotateOpen] = useState(false);
  const [annotateSrc, setAnnotateSrc] = useState('');
  const [annotations, setAnnotations] = useState<ImageAnnotationItem[]>([]);
  const openAnnotate = (img: GalleryImage) => {
    setAnnotateSrc(srcOf(img));
    setAnnotations([]);
    setAnnotateOpen(true);
  };

  // 裁剪
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState('');
  const cropperRef = useRef<ImageCropperRef>(null);
  const openCrop = (img: GalleryImage) => {
    setCropSrc(srcOf(img));
    setCropOpen(true);
  };
  const applyCrop = async () => {
    try {
      const result = await cropperRef.current?.getCropResult();
      if (result) {
        const { width, height } = result.cropRect;
        Message.success({
          content: `已裁剪区域 ${Math.round(width)} × ${Math.round(height)}（演示）`,
          duration: 2200,
        });
      }
    } catch {
      Message.warning({ content: '裁剪未完成（演示）', duration: 1800 });
    }
    setCropOpen(false);
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
            <div key={img.id} className="h-56 w-full sm:h-72">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((img, index) => (
              <Card key={img.id}>
                <div className="h-40 w-full overflow-hidden rounded-lg">
                  <Image src={srcOf(img)} alt={img.title} fit="cover" className="h-full w-full" />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Text weight="medium" className="block truncate">
                      {img.title}
                    </Text>
                    <Tag size="sm" variant="info">
                      {img.album === 'product' ? '产品' : '团队'}
                    </Tag>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openViewer(index)}>
                    查看
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openAnnotate(img)}>
                    标注
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openCrop(img)}>
                    裁剪
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </ImageGroup>
      ) : (
        <Card>
          <Empty preset="no-data" description="该相册暂无图片，切换到“产品 / 团队”查看示例素材。" />
        </Card>
      )}

      <ImageViewer
        images={filteredSrcs}
        open={viewerOpen}
        currentIndex={viewerIndex}
        onOpenChange={setViewerOpen}
        onCurrentIndexChange={setViewerIndex}
        onClose={() => setViewerOpen(false)}
      />

      <ImagePreview images={filteredSrcs} open={previewOpen} onOpenChange={setPreviewOpen} />

      <Drawer placement="right" open={annotateOpen} title="图片标注" width="560px" mask maskClosable onClose={() => setAnnotateOpen(false)}>
        {annotateOpen && (
          <div className="space-y-3">
            <ImageAnnotation
              src={annotateSrc}
              value={annotations}
              tools={['select', 'rectangle', 'ellipse']}
              defaultTool="rectangle"
              onChange={(next) => setAnnotations(next)}
            />
            <Text size="sm" color="secondary">
              已标注 {annotations.length} 个区域（演示，刷新后重置）。
            </Text>
          </div>
        )}
      </Drawer>

      <Drawer placement="right" open={cropOpen} title="图片裁剪" width="560px" mask maskClosable onClose={() => setCropOpen(false)}>
        {cropOpen && (
          <div className="space-y-3">
            <ImageCropper ref={cropperRef} src={cropSrc} aspectRatio={16 / 9} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCropOpen(false)}>
                取消
              </Button>
              <Button onClick={applyCrop}>应用裁剪</Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default GalleryPage;
