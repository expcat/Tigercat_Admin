import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, AvatarGroup, Button, Card, Tag, Text } from '@expcat/tigercat-react';
import { Descriptions } from '@expcat/tigercat-react/Descriptions';
import { Progress } from '@expcat/tigercat-react/Progress';
import { Steps, StepsItem } from '@expcat/tigercat-react/Steps';
import { Tabs } from '@expcat/tigercat-react/Tabs';
import { TabPane } from '@expcat/tigercat-react/TabPane';
import { Anchor, AnchorLink } from '@expcat/tigercat-react/Anchor';
import { Timeline } from '@expcat/tigercat-react/Timeline';
import { CommentThread } from '@expcat/tigercat-react/CommentThread';
import { Empty } from '@expcat/tigercat-react/Empty';
import type { DescriptionsItem } from '@expcat/tigercat-core';
import { PageHeader } from '../components/PageHeader';
import {
  ChartEmptyState,
  MetricCard,
  MetricGrid,
  MutedPanel,
  PageActionPanel,
} from '../components/PageFragments';
import { ClockIcon, PackageIcon, UsersIcon, ZapIcon } from '../components/Icons';
import {
  getProjectById,
  getProjectProgressStatus,
  getProjectRemainDays,
  PROJECT_DETAIL_TABS,
  PROJECT_MILESTONES,
  PROJECT_STATUS_META,
  readProjectId,
  type ProjectDetailTab,
  type ProjectRecord,
} from '../utils/projects';

const getScrollContainer = (): HTMLElement | Window =>
  document.getElementById('main-content-scroll') ?? window;

function tabFromHref(href: string): ProjectDetailTab {
  if (href.includes('members')) {
    return 'members';
  }
  if (href.includes('activity')) {
    return 'activity';
  }
  return 'overview';
}

function ProjectDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const id = readProjectId(params.id);
  const project = getProjectById(id);
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>('overview');

  const overviewItems = useMemo<DescriptionsItem[]>(() => {
    if (!project) {
      return [];
    }
    const status = PROJECT_STATUS_META[project.status];
    return [
      { label: '项目编号', content: project.id },
      { label: '负责人', content: project.owner },
      { label: '所属部门', content: project.department },
      { label: '状态', content: status.label },
      { label: '开始日期', content: project.startAt },
      { label: '计划完成', content: project.endAt },
      { label: '预算', content: `${project.budget} 万` },
      { label: '成员人数', content: `${project.members.length} 人` },
    ];
  }, [project]);

  const goBackToList = () => {
    navigate('/projects');
  };

  const handleTabChange = (key: string | number) => {
    const next = String(key);
    if (next === 'overview' || next === 'members' || next === 'activity') {
      setActiveTab(next);
    }
  };

  const handleAnchorClick = (_event: React.MouseEvent, href: string) => {
    setActiveTab(tabFromHref(href));
  };

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={<PackageIcon size={24} />}
          title="未找到项目"
          subtitle={id ? `没有编号为 ${id} 的项目` : '缺少项目编号'}
          tags={[
            { label: '项目', variant: 'primary' },
            { label: '未找到', variant: 'warning' },
          ]}
        />
        <PageActionPanel
          title="返回列表"
          description="详情页不在侧栏菜单中，列表菜单项会继续保持高亮。"
          actions={
            <Button variant="outline" onClick={goBackToList}>
              返回项目列表
            </Button>
          }
        />
        <Card>
          <Empty description="该项目不存在或已被移除，请从项目列表重新进入。" />
        </Card>
      </div>
    );
  }

  return (
    <ProjectDetailContent
      project={project}
      overviewItems={overviewItems}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onAnchorClick={handleAnchorClick}
      onBack={goBackToList}
    />
  );
}

function ProjectDetailContent({
  project,
  overviewItems,
  activeTab,
  onTabChange,
  onAnchorClick,
  onBack,
}: {
  project: ProjectRecord;
  overviewItems: DescriptionsItem[];
  activeTab: ProjectDetailTab;
  onTabChange: (key: string | number) => void;
  onAnchorClick: (event: React.MouseEvent, href: string) => void;
  onBack: () => void;
}) {
  const status = PROJECT_STATUS_META[project.status];
  const remainDays = getProjectRemainDays(project);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<PackageIcon size={24} />}
        title={project.name}
        subtitle={project.summary}
        tags={[
          { label: status.label, variant: status.variant },
          { label: project.department, variant: 'info' },
        ]}
      />

      <PageActionPanel
        title="项目详情"
        description="标准列表到详情模板：概要、里程碑、成员与讨论均使用页面内演示数据。"
        actions={
          <Button variant="outline" onClick={onBack}>
            返回项目列表
          </Button>
        }
      />

      <MetricGrid columns={4}>
        <MetricCard
          title="当前进度"
          value={project.progress}
          description={`${status.label} · ${PROJECT_MILESTONES[project.milestone]}`}
          icon={<ZapIcon size={20} />}
        />
        <MetricCard
          title="成员"
          value={project.members.length}
          description={`负责人 ${project.owner}`}
          icon={<UsersIcon size={20} />}
        />
        <MetricCard
          title="预算"
          value={project.budget}
          description="万元"
          icon={<PackageIcon size={20} />}
        />
        <MetricCard
          title="剩余天数"
          value={remainDays}
          description={`计划 ${project.endAt}`}
          icon={<ClockIcon size={20} />}
        />
      </MetricGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0 space-y-4">
          <Tabs activeKey={activeTab} onChange={onTabChange}>
            <TabPane tabKey="overview" label="概览">
              <div id="project-overview" className="space-y-4">
                <Card header={<Text weight="bold">项目概要</Text>}>
                  <Descriptions items={overviewItems} column={{ xs: 1, sm: 2 }} bordered colon />
                </Card>
                <Card header={<Text weight="bold">里程碑</Text>}>
                  <Steps current={project.milestone} size="small">
                    {PROJECT_MILESTONES.map((label, index) => (
                      <StepsItem
                        key={label}
                        title={label}
                        description={index === project.milestone ? '当前阶段' : ''}
                      />
                    ))}
                  </Steps>
                  <div className="mt-4">
                    <Progress
                      percentage={project.progress}
                      status={getProjectProgressStatus(project)}
                    />
                  </div>
                </Card>
              </div>
            </TabPane>
            <TabPane tabKey="members" label="成员">
              <div id="project-members" className="space-y-4">
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <AvatarGroup max={6} size="md">
                      {project.members.map((member) => (
                        <Avatar
                          key={member.id}
                          size="md"
                          bgColor={member.color}
                          textColor="#ffffff"
                        >
                          {member.name.slice(0, 1)}
                        </Avatar>
                      ))}
                    </AvatarGroup>
                    <Text size="sm" color="secondary">
                      共 {project.members.length} 名成员
                    </Text>
                  </div>
                </Card>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {project.members.map((member) => (
                    <Card key={member.id}>
                      <div className="flex items-center gap-3">
                        <Avatar size="lg" bgColor={member.color} textColor="#ffffff">
                          {member.name.slice(0, 1)}
                        </Avatar>
                        <div className="min-w-0">
                          <Text weight="bold">{member.name}</Text>
                          <div className="mt-1 flex items-center gap-2">
                            <Tag variant="info" size="sm">
                              {member.role}
                            </Tag>
                            {member.name === project.owner ? (
                              <Tag variant="primary" size="sm">
                                负责人
                              </Tag>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </TabPane>
            <TabPane tabKey="activity" label="动态">
              <div id="project-activity" className="space-y-4">
                <Card header={<Text weight="bold">项目动态</Text>}>
                  {project.activities.length ? (
                    <Timeline items={project.activities} />
                  ) : (
                    <ChartEmptyState description="暂无项目动态" heightClassName="h-36" />
                  )}
                </Card>
                <Card header={<Text weight="bold">讨论</Text>}>
                  {project.comments.length ? (
                    <CommentThread
                      nodes={project.comments}
                      showReply={false}
                      showLike={false}
                      showMore={false}
                      emptyText="暂无讨论"
                    />
                  ) : (
                    <MutedPanel compact description="还没有讨论，可在后续迭代接入回复。" />
                  )}
                </Card>
              </div>
            </TabPane>
          </Tabs>
        </div>

        <div className="hidden lg:block">
          <Card header={<Text weight="bold">页内导航</Text>}>
            <Anchor
              affix={false}
              getContainer={getScrollContainer}
              offsetTop={16}
              onClick={onAnchorClick}
            >
              {PROJECT_DETAIL_TABS.map((item) => (
                <AnchorLink key={item.key} href={item.href} title={item.label} />
              ))}
            </Anchor>
            <MutedPanel
              compact
              className="mt-3"
              description="点击目录切换概览、成员或动态，并滚动到对应区块。"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ProjectDetailPage;
