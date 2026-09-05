import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@expcat/tigercat-react/Avatar';
import { AvatarGroup } from '@expcat/tigercat-react/AvatarGroup';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Input } from '@expcat/tigercat-react/Input';
import { Message } from '@expcat/tigercat-react/Message';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';
import { Statistic } from '@expcat/tigercat-react/Statistic';
import { Progress } from '@expcat/tigercat-react/Progress';
import { Segmented } from '@expcat/tigercat-react/Segmented';
import { Pagination } from '@expcat/tigercat-react/Pagination';
import { Empty } from '@expcat/tigercat-react/Empty';
import { PageHeader } from '../components/PageHeader';
import { MetricCard, MetricGrid, PageActionPanel } from '../components/PageFragments';
import { CheckCircleIcon, ClockIcon, PackageIcon, TrendingUpIcon } from '../components/Icons';
import {
  fetchProjects,
  getProjectProgressStatus,
  PROJECT_PAGE_SIZE,
  PROJECT_STATUS_FILTERS,
  PROJECT_STATUS_META,
  type ProjectRecord,
  type ProjectStatusFilter,
} from '../utils/projects';

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

function ProjectsPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
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
    let cancelled = false;
    const loadProjects = async () => {
      setLoading(true);
      try {
        const payload = await fetchProjects({
          page,
          pageSize: PROJECT_PAGE_SIZE,
          status: statusFilter,
          keyword,
        });
        if (cancelled) {
          return;
        }
        setProjects(payload.data.items ?? []);
        setTotal(payload.data.total ?? 0);
      } catch (error: unknown) {
        if (!cancelled) {
          Message.error({ content: readErrorMessage(error, '项目列表加载失败'), duration: 3000 });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void loadProjects();
    return () => {
      cancelled = true;
    };
  }, [keyword, statusFilter, page]);

  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      try {
        const payload = await fetchProjects({ page: 1, pageSize: 200 });
        if (!cancelled) {
          setStatsProjects(payload.data.items ?? []);
        }
      } catch {
        if (!cancelled) {
          setStatsProjects([]);
        }
      }
    };
    void loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    setPage(1);
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
      setStatusFilter(next);
      setPage(1);
    }
  };

  const openProject = (id: string) => {
    navigate(`/projects/${id}`);
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
          value={statsProjects.length}
          description="全部项目"
          icon={<PackageIcon size={20} />}
        />
        <MetricCard
          title="进行中"
          value={activeCount}
          description="当前推进中的项目"
          icon={<TrendingUpIcon size={20} />}
        />
        <MetricCard
          title="已完成"
          value={doneCount}
          description="已发布归档"
          icon={<CheckCircleIcon size={20} />}
        />
        <MetricCard
          title="平均进度"
          value={avgProgress}
          description="全部项目进度均值"
          icon={<ClockIcon size={20} />}
        />
      </MetricGrid>

      <PageActionPanel
        title="筛选项目"
        description="按名称、负责人和编号搜索，再用状态分段过滤；分页仅作用于当前筛选结果。"
        actions={
          <>
            <Input
              value={keyword}
              onChange={(event) => handleKeywordChange(event.target.value)}
              placeholder="搜索名称 / 负责人 / 编号"
              clearable
              className="w-full sm:w-64"
            />
            <Segmented
              value={statusFilter}
              options={PROJECT_STATUS_FILTERS}
              onChange={handleStatusChange}
            />
          </>
        }
      />

      {projects.length > 0 ? (
        <div
          data-testid="projects-grid"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={openProject}
            />
          ))}
        </div>
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
            onChange={setPage}
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
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(project.id);
            }}
          >
            查看详情
          </Button>
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
