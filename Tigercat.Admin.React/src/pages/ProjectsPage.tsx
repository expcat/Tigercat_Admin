import type { ProjectRecord, ProjectStatusFilter } from '../utils/types';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '@expcat/tigercat-react/Avatar';
import { AvatarGroup } from '@expcat/tigercat-react/AvatarGroup';
import { Card } from '@expcat/tigercat-react/Card';
import { Input } from '@expcat/tigercat-react/Input';
import { Button } from '@expcat/tigercat-react/Button';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import { Statistic } from '@expcat/tigercat-react/Statistic';
import { Progress } from '@expcat/tigercat-react/Progress';
import { Segmented } from '@expcat/tigercat-react/Segmented';
import { Pagination } from '@expcat/tigercat-react/Pagination';
import { Empty } from '@expcat/tigercat-react/Empty';
import { Row } from '@expcat/tigercat-react/Row';
import { Col } from '@expcat/tigercat-react/Col';
import { PageHeader } from '../components/PageHeader';
import { MetricCard, MetricGrid, PageActionPanel } from '../components/PageFragments';
import { CheckCircleIcon, ClockIcon, PackageIcon, TrendingUpIcon } from '../components/Icons';
import {
  fetchProjects,
  getProjectProgressStatus,
  PROJECT_PAGE_SIZE,
  PROJECT_STATUS_FILTERS,
  PROJECT_STATUS_META,
} from '../utils/projects';

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') ?? '';
  const rawStatus = searchParams.get('status');
  const statusFilter: ProjectStatusFilter = PROJECT_STATUS_FILTERS.some(item => item.value === rawStatus) ? rawStatus as ProjectStatusFilter : 'all';
  const rawPage = Number(searchParams.get('page'));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const [retryVersion, setRetryVersion] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [statsError, setStatsError] = useState('');
  const [statsTotal, setStatsTotal] = useState<number | null>(null);
  const updateQuery = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (!value || value === 'all' || (key === 'page' && value === '1')) next.delete(key);
      else next.set(key, value);
    });
    setSearchParams(next, { replace: true });
  };
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [statsProjects, setStatsProjects] = useState<ProjectRecord[]>([]);

  const activeCount = useMemo(
    () => statsProjects.filter((item) => item.status === 'active').length,
    [statsProjects],
  );
  const doneCount = useMemo(
    () => statsProjects.filter((item) => item.status === 'done').length,
    [statsProjects],
  );
  const avgProgress = useMemo(() => {
    if (statsProjects.length === 0) {
      return 0;
    }
    return Math.round(
      statsProjects.reduce((sum, item) => sum + item.progress, 0) / statsProjects.length,
    );
  }, [statsProjects]);

  useEffect(() => {
    const controller = new AbortController();
    const loadProjects = async () => {
      setLoading(true);
      setLoadError('');
      setProjects([]);
      setTotal(0);
      try {
        const payload = await fetchProjects({
          page,
          pageSize: PROJECT_PAGE_SIZE,
          status: statusFilter,
          keyword,
        }, controller.signal);
        if (controller.signal.aborted) {
          return;
        }
        const lastPage = Math.max(1, Math.ceil(payload.data.total / PROJECT_PAGE_SIZE));
        if (page > lastPage) { updateQuery({ page: String(lastPage) }); return; }
        setProjects(payload.data.items ?? []);
        setTotal(payload.data.total ?? 0);
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setLoadError(readErrorMessage(error, '项目列表加载失败'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    void loadProjects();
    return () => {
      controller.abort();
    };
  }, [keyword, statusFilter, page, retryVersion]);

  useEffect(() => {
    const controller = new AbortController();
    const loadStats = async () => {
      setStatsError('');
      setStatsTotal(null);
      try {
        const payload = await fetchProjects({ page: 1, pageSize: 200 }, controller.signal);
        if (!controller.signal.aborted) {
          setStatsProjects(payload.data.items ?? []);
          setStatsTotal(payload.data.total);
        }
      } catch {
        if (!controller.signal.aborted) {
          setStatsProjects([]);
          setStatsError('项目统计加载失败');
        }
      }
    };
    void loadStats();
    return () => {
      controller.abort();
    };
  }, [retryVersion]);

  const handleKeywordChange = (value: string | number) => {
    updateQuery({ keyword: String(value), page: '1' });
  };

  const handleStatusChange = (value: string | number) => {
    const next = String(value);
    if (
      next === 'all' ||
      next === 'planning' ||
      next === 'active' ||
      next === 'paused' ||
      next === 'done'
    ) {
      updateQuery({ status: next, page: '1' });
    }
  };

  const openProject = (id: string) => {
    const search = searchParams.toString();
    navigate(`/projects/${encodeURIComponent(id)}${search ? `?${search}` : ''}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<PackageIcon size={24} />}
        title="项目列表"
        subtitle="卡片网格浏览项目，点击进入动态路由详情，演示列表到详情模板"
        tags={[
          { label: '项目', variant: 'primary' },
          { label: '演示数据', variant: 'info' },
        ]}
      />

      <MetricGrid columns={4}>
        <MetricCard
          title="项目总数"
          value={statsTotal ?? '—'}
          description="接口返回的全部项目总数"
          icon={<PackageIcon size={20} />}
        />
        <MetricCard
          title="进行中"
          value={statsTotal === null ? '—' : activeCount}
          description={`已加载 ${statsProjects.length} 条中的进行中数量`}
          icon={<TrendingUpIcon size={20} />}
        />
        <MetricCard
          title="已完成"
          value={statsTotal === null ? '—' : doneCount}
          description={`已加载 ${statsProjects.length} 条中的已完成数量`}
          icon={<CheckCircleIcon size={20} />}
        />
        <MetricCard
          title="平均进度"
          value={statsTotal === null ? '—' : avgProgress}
          description={`已加载 ${statsProjects.length} 条的进度均值（最多 200 条）`}
          icon={<ClockIcon size={20} />}
        />
      </MetricGrid>

      {statsError && <div role="alert" className="flex flex-wrap items-center gap-3"><Text color="danger">{statsError}</Text><Button variant="outline" onClick={() => setRetryVersion(value => value + 1)}>重试项目统计</Button></div>}

      <PageActionPanel
        title="筛选项目"
        description="按名称、负责人和编号搜索，再用状态分段过滤；分页仅作用于当前筛选结果。"
        actions={
          <>
            <Input
              value={keyword}
              onChange={handleKeywordChange}
              placeholder="搜索名称 / 负责人 / 编号"
              clearable
              className="w-full sm:w-64"
            />
            <Segmented
              size="sm"
              aria-label="项目状态"
              value={statusFilter}
              options={PROJECT_STATUS_FILTERS}
              onChange={handleStatusChange}
            />
          </>
        }
      />

      {loadError ? <Card><div role="alert" className="space-y-3"><Text color="danger">{loadError}</Text><Button variant="outline" onClick={() => setRetryVersion(value => value + 1)}>重试项目列表</Button></div></Card> : projects.length > 0 ? (
        <Row
          data-testid="projects-grid"
          gutter={[16, 16]}
        >
          {projects.map((project) => (
            <Col key={project.id} span={{ xs: 24, md: 12, xl: 8 }}>
              <ProjectCard
                project={project}
                onOpen={openProject}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <Card>
          <Empty
            description={loading ? '正在加载项目…' : '没有符合条件的项目，试试调整搜索或状态筛选。'}
          />
        </Card>
      )}

      {total > 0 ? (
        <div className="flex justify-end">
          <Pagination
            current={page}
            total={total}
            pageSize={PROJECT_PAGE_SIZE}
            onChange={(value) => updateQuery({ page: String(value) })}
          />
        </div>
      ) : null}
    </div>
  );
}

function ProjectCard({
  project,
  onOpen,
}: {
  project: ProjectRecord;
  onOpen: (id: string) => void;
}) {
  const status = PROJECT_STATUS_META[project.status];

  return (
    <Card
      hoverable
      className="cursor-pointer"
      data-testid={`project-card-${project.id}`}
      onClick={() => onOpen(project.id)}
      footer={
        <div className="flex justify-end">
          <Text size="sm" color="primary">查看详情 →</Text>
        </div>
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Text weight="bold" className="block truncate">
            {project.name}
          </Text>
          <Text size="sm" color="secondary" className="mt-1 block">
            {project.id} · {project.owner}
          </Text>
        </div>
        <Tag variant={status.variant} size="sm">
          {status.label}
        </Tag>
      </div>
      <Text size="sm" color="secondary" className="mt-3 block">
        {project.summary}
      </Text>
      <div className="mt-4">
        <Statistic title="进度" value={project.progress} suffix="%" />
        <div className="mt-2">
          <Progress
            percentage={project.progress}
            status={getProjectProgressStatus(project)}
            size="sm"
          />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <AvatarGroup max={4} size="sm">
          {project.members.map((member) => (
            <Avatar
              key={member.id}
              size="sm"
              bgColor={member.color}
              textColor="#ffffff"
            >
              {member.name.slice(0, 1)}
            </Avatar>
          ))}
        </AvatarGroup>
        <Text size="sm" color="secondary">
          {project.members.length} 人
        </Text>
      </div>
    </Card>
  );
}

export default ProjectsPage;
