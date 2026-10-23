import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '@expcat/tigercat-react/Alert';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { CopyButton } from '@expcat/tigercat-react/CopyButton';
import { Image } from '@expcat/tigercat-react/Image';
import { Message } from '@expcat/tigercat-react/Message';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import { PageHeader } from '../components/PageHeader';
import { FileTextIcon } from '../components/Icons';
import { ImageAnnotation } from '../utils/lazyTigercat';
import { formatMediaBytes, getMediaDetail } from '../utils/media';
import { ApiError } from '../utils/request';
import type { MediaDetail } from '../utils/types';

export default function FileDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(0);
  const [retry, setRetry] = useState(0);
  const validId = /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));
  useEffect(() => {
    const controller = new AbortController();
    setDetail(null);
    setError('');
    setStatus(0);
    if (!validId) {
      setStatus(404);
      setError('媒体资源不存在');
      setLoading(false);
      return;
    }
    setLoading(true);
    void getMediaDetail(Number(id), controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) setDetail(data);
    }).catch((failure) => {
      if (controller.signal.aborted) return;
      setStatus(failure instanceof ApiError ? failure.status : 0);
      setError(failure instanceof Error ? failure.message : '媒体详情加载失败');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, validId, retry]);
  const onCopy = (ok: boolean) => ok
    ? Message.success({ content: 'URL 已复制', duration: 1800 })
    : Message.error({ content: '复制失败，请重试', duration: 2200 });

  return <div className="space-y-6">
    <PageHeader icon={<FileTextIcon size={24} />} title="媒体详情" subtitle={detail?.originalFileName ?? '查看媒体元数据、图片标注与引用来源'} tags={[{ label: '媒体资源', variant: 'primary' }]} />
    <Button variant="outline" onClick={() => navigate('/files')}>返回文件管理</Button>
    {loading ? <Card><Text>正在加载媒体详情…</Text></Card> : error ?
      <Alert type="error" title={status === 404 ? '媒体资源不存在' : status === 403 ? '无权查看媒体' : '媒体详情加载失败'} description={error}
        action={validId && status !== 404 && <Button onClick={() => setRetry((value) => value + 1)}>重试</Button>} /> : detail && <>
        <Card>
          {detail.contentType.startsWith('image/') ? <div className="mb-4 overflow-hidden rounded border border-(--tiger-border) bg-(--tiger-bg-page)">
            {detail.annotations.length ? <ImageAnnotation src={detail.url} alt={detail.originalFileName} value={detail.annotations} readonly tools={['select']} /> :
              <Image src={detail.url} alt={detail.originalFileName} fit="contain" className="max-h-96 w-full" />}
          </div> : <Text className="mb-4 block" color="secondary">此文件没有图片预览，可打开资源查看或下载。</Text>}
          <dl className="grid min-w-0 gap-4 text-sm sm:grid-cols-2">
            <div><dt className="p2-text-secondary">文件名</dt><dd className="break-all">{detail.originalFileName}</dd></div>
            <div><dt className="p2-text-secondary">大小</dt><dd>{formatMediaBytes(detail.sizeBytes)}</dd></div>
            <div><dt className="p2-text-secondary">类型</dt><dd className="break-all">{detail.contentType}</dd></div>
            <div><dt className="p2-text-secondary">存储提供方</dt><dd>{detail.storageProvider}</dd></div>
            <div><dt className="p2-text-secondary">尺寸</dt><dd>{detail.width && detail.height ? `${detail.width} × ${detail.height} 像素` : '未识别'}</dd></div>
            <div><dt className="p2-text-secondary">上传人</dt><dd>{detail.uploadedBy || '未知'}</dd></div>
            <div><dt className="p2-text-secondary">上传时间</dt><dd>{new Date(detail.createdAt).toLocaleString('zh-CN')}</dd></div>
            <div><dt className="p2-text-secondary">已保存标注</dt><dd>{detail.annotations.length} 个区域</dd></div>
            <div className="sm:col-span-2"><dt className="p2-text-secondary">SHA256</dt><dd className="break-all">{detail.sha256Hash || '未记录'}</dd></div>
            <div className="min-w-0 sm:col-span-2"><dt className="p2-text-secondary">资源 URL</dt><dd className="line-clamp-3 break-all">{detail.url}</dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <CopyButton text={new URL(detail.url, window.location.origin).href} label="复制 URL" onCopy={onCopy} />
            <CopyButton text={window.location.href} label="复制详情链接" onCopy={onCopy} />
            <Button variant="outline" onClick={() => window.open(detail.url, '_blank', 'noopener,noreferrer')}>打开资源</Button>
          </div>
        </Card>
        <Card header={<Text weight="bold">引用来源（{detail.references.length}）</Text>}>
          {!detail.references.length ? <Text color="secondary">暂无引用</Text> : <ul className="space-y-2">{detail.references.map((reference) => <li key={reference.id} className="flex flex-wrap items-center gap-2 break-all">
            <Tag variant="primary" size="sm">{reference.referenceType}</Tag><span>{reference.displayName || reference.referenceKey}</span>
          </li>)}</ul>}
        </Card>
      </>}
  </div>;
}
