import type {
  CommentNode,
  ProgressStatus,
  SegmentedOption,
  TagVariant,
  TimelineItem,
} from '@expcat/tigercat-core';

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'done';
export type ProjectStatusFilter = 'all' | ProjectStatus;
export type ProjectDetailTab = 'overview' | 'members' | 'activity';

export interface ProjectMember {
  id: string;
  name: string;
  role: string;
  color: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  summary: string;
  owner: string;
  department: string;
  status: ProjectStatus;
  progress: number;
  milestone: number;
  budget: number;
  startAt: string;
  endAt: string;
  members: ProjectMember[];
  activities: TimelineItem[];
  comments: CommentNode[];
}

export const PROJECT_PAGE_SIZE = 6;

export const PROJECT_MILESTONES = ['需求评审', '开发实现', '联调验收', '发布上线'];

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; variant: TagVariant }
> = {
  planning: { label: '规划中', variant: 'info' },
  active: { label: '进行中', variant: 'primary' },
  paused: { label: '已暂停', variant: 'warning' },
  done: { label: '已完成', variant: 'success' },
};

export const PROJECT_STATUS_FILTERS: SegmentedOption[] = [
  { value: 'all', label: '全部' },
  { value: 'planning', label: '规划中' },
  { value: 'active', label: '进行中' },
  { value: 'paused', label: '已暂停' },
  { value: 'done', label: '已完成' },
];

export const PROJECT_DETAIL_TABS: Array<{
  key: ProjectDetailTab;
  label: string;
  href: string;
}> = [
  { key: 'overview', label: '概览', href: '#project-overview' },
  { key: 'members', label: '成员', href: '#project-members' },
  { key: 'activity', label: '动态', href: '#project-activity' },
];

const MEMBERS = {
  wang: { id: 'm-wang', name: '王小虎', role: '前端', color: '#3b82f6' },
  li: { id: 'm-li', name: '李工', role: '后端', color: '#22c55e' },
  zhang: { id: 'm-zhang', name: '张运维', role: '运维', color: '#f59e0b' },
  chen: { id: 'm-chen', name: '陈测试', role: '测试', color: '#a855f7' },
  zhao: { id: 'm-zhao', name: '赵敏', role: '产品', color: '#ef4444' },
  sun: { id: 'm-sun', name: '孙莉', role: '设计', color: '#14b8a6' },
} as const;

export const PROJECTS: ProjectRecord[] = [
  {
    id: '1001',
    name: '智能运营台',
    summary: '统一仪表盘、快捷跳转与运营指标的卡片工作台。',
    owner: '王小虎',
    department: '平台研发部',
    status: 'active',
    progress: 68,
    milestone: 2,
    budget: 86,
    startAt: '2026-03-12',
    endAt: '2026-09-30',
    members: [MEMBERS.wang, MEMBERS.li, MEMBERS.zhao, MEMBERS.sun],
    activities: [
      { key: 'a1', label: '今天 09:20', content: '王小虎 更新了里程碑「联调验收」', color: '#3b82f6' },
      { key: 'a2', label: '昨天 18:04', content: '李工 合并权限接口联调分支', color: '#22c55e' },
      { key: 'a3', label: '08-21 11:12', content: '赵敏 补充运营指标口径说明', color: '#64748b' },
    ],
    comments: [
      {
        id: 'c1',
        content: '仪表盘空状态文案建议改成「暂无运营数据」。',
        user: { name: '赵敏' },
        time: '2026-08-21 11:20',
        children: [
          {
            id: 'c1-1',
            content: '已记下，下个迭代一起改 PageHeader 说明。',
            user: { name: '王小虎' },
            time: '2026-08-21 14:02',
          },
        ],
      },
      {
        id: 'c2',
        content: '权限码过滤菜单已经对上，demo 账号可用来演示 403。',
        user: { name: '李工' },
        time: '2026-08-22 09:40',
      },
    ],
  },
  {
    id: '1002',
    name: '权限治理升级',
    summary: '梳理角色权限树、入口守卫与只读演示账号策略。',
    owner: '李工',
    department: '安全治理组',
    status: 'planning',
    progress: 18,
    milestone: 0,
    budget: 42,
    startAt: '2026-08-04',
    endAt: '2026-11-15',
    members: [MEMBERS.li, MEMBERS.chen, MEMBERS.zhang],
    activities: [
      { key: 'a1', label: '08-18 16:30', content: '李工 提交权限矩阵初稿', color: '#3b82f6' },
      { key: 'a2', label: '08-16 10:05', content: '陈测试 列出回归用例范围', color: '#a855f7' },
    ],
    comments: [
      {
        id: 'c1',
        content: '建议把入口权限和无按钮权限分开记录，避免菜单误隐藏。',
        user: { name: '陈测试' },
        time: '2026-08-18 17:10',
      },
    ],
  },
  {
    id: '1003',
    name: '媒体资源中台',
    summary: '图库、裁剪、标注与文件管理共用同一套媒体契约。',
    owner: '孙莉',
    department: '内容中台',
    status: 'active',
    progress: 54,
    milestone: 1,
    budget: 63,
    startAt: '2026-05-08',
    endAt: '2026-10-20',
    members: [MEMBERS.sun, MEMBERS.wang, MEMBERS.zhang, MEMBERS.chen],
    activities: [
      { key: 'a1', label: '08-20 15:44', content: '孙莉 完成 16:9 裁剪交互', color: '#14b8a6' },
      { key: 'a2', label: '08-19 09:18', content: '张运维 调整本地媒体存储配额', color: '#f59e0b' },
    ],
    comments: [
      {
        id: 'c1',
        content: '大图查看在窄屏下旋转按钮容易被底栏挡住，需要再核一次。',
        user: { name: '王小虎' },
        time: '2026-08-20 16:02',
      },
    ],
  },
  {
    id: '1004',
    name: '工单协作 2.0',
    summary: '主从分栏、生命周期步骤与内部备注讨论的协作模板。',
    owner: '赵敏',
    department: '客户成功',
    status: 'paused',
    progress: 41,
    milestone: 1,
    budget: 55,
    startAt: '2026-04-22',
    endAt: '2026-12-01',
    members: [MEMBERS.zhao, MEMBERS.wang, MEMBERS.li],
    activities: [
      { key: 'a1', label: '08-12 19:00', content: '赵敏 暂停迭代，等待客服排期', color: '#f59e0b' },
      { key: 'a2', label: '08-08 11:26', content: '王小虎 完成 CommentThread 接入', color: '#3b82f6' },
    ],
    comments: [
      {
        id: 'c1',
        content: '内部备注先保持只读展示，回复能力放到下一阶段。',
        user: { name: '赵敏' },
        time: '2026-08-12 19:12',
      },
    ],
  },
  {
    id: '1005',
    name: '报表打印服务',
    summary: 'A4 打印布局、水印与渠道明细的导出演示。',
    owner: '陈测试',
    department: '数据分析',
    status: 'done',
    progress: 100,
    milestone: 3,
    budget: 28,
    startAt: '2026-02-10',
    endAt: '2026-06-30',
    members: [MEMBERS.chen, MEMBERS.li, MEMBERS.zhao],
    activities: [
      { key: 'a1', label: '06-30 17:40', content: '陈测试 关闭里程碑「发布上线」', color: '#22c55e' },
      { key: 'a2', label: '06-28 10:16', content: '李工 补齐打印分页分隔', color: '#3b82f6' },
    ],
    comments: [
      {
        id: 'c1',
        content: '销售周报区间切换已验收，可以归档。',
        user: { name: '赵敏' },
        time: '2026-06-30 18:05',
      },
    ],
  },
  {
    id: '1006',
    name: '监控可观测性',
    summary: '资源水位、QPS/延迟滚动窗口与节点事件流。',
    owner: '张运维',
    department: '基础设施',
    status: 'active',
    progress: 72,
    milestone: 2,
    budget: 91,
    startAt: '2026-06-01',
    endAt: '2026-09-15',
    members: [MEMBERS.zhang, MEMBERS.li, MEMBERS.chen, MEMBERS.wang],
    activities: [
      { key: 'a1', label: '今天 08:11', content: '张运维 调整默认刷新间隔为 3 秒', color: '#f59e0b' },
      { key: 'a2', label: '昨天 21:33', content: '李工 封顶事件流环形缓冲', color: '#22c55e' },
    ],
    comments: [
      {
        id: 'c1',
        content: '暂停后定时器必须清掉，页面卸载也要停 tick。',
        user: { name: '陈测试' },
        time: '2026-08-22 10:18',
      },
    ],
  },
  {
    id: '1007',
    name: '导入向导优化',
    summary: '字段映射、冲突策略与导入进度结果页的体验打磨。',
    owner: '李工',
    department: '平台研发部',
    status: 'planning',
    progress: 8,
    milestone: 0,
    budget: 36,
    startAt: '2026-08-18',
    endAt: '2026-12-20',
    members: [MEMBERS.li, MEMBERS.sun, MEMBERS.chen],
    activities: [
      { key: 'a1', label: '08-19 14:22', content: '李工 收集现有向导痛点', color: '#3b82f6' },
    ],
    comments: [
      {
        id: 'c1',
        content: '穿梭框在窄屏上的操作区需要先做一版换行方案。',
        user: { name: '孙莉' },
        time: '2026-08-19 15:01',
      },
    ],
  },
  {
    id: '1008',
    name: '帮助中心改版',
    summary: '锚点目录、FAQ 手风琴与无限加载文章列表。',
    owner: '王小虎',
    department: '体验设计',
    status: 'done',
    progress: 100,
    milestone: 3,
    budget: 19,
    startAt: '2026-01-15',
    endAt: '2026-05-20',
    members: [MEMBERS.wang, MEMBERS.sun, MEMBERS.zhao],
    activities: [
      { key: 'a1', label: '05-20 16:00', content: '王小虎 发布帮助中心改版', color: '#22c55e' },
      { key: 'a2', label: '05-18 09:42', content: '孙莉 完成目录吸顶视觉', color: '#14b8a6' },
    ],
    comments: [
      {
        id: 'c1',
        content: '锚点滚动容器已指向 #main-content-scroll，无需再改。',
        user: { name: '王小虎' },
        time: '2026-05-20 16:12',
      },
    ],
  },
];

export function readProjectId(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return '';
}

export function getProjectById(id: string): ProjectRecord | undefined {
  return PROJECTS.find((project) => project.id === id);
}

export function filterProjects(
  keyword: string,
  status: ProjectStatusFilter,
): ProjectRecord[] {
  const kw = keyword.trim().toLowerCase();
  return PROJECTS.filter((project) => {
    const matchStatus = status === 'all' || project.status === status;
    const matchKw =
      !kw ||
      `${project.name} ${project.owner} ${project.id} ${project.summary}`
        .toLowerCase()
        .includes(kw);
    return matchStatus && matchKw;
  });
}

export function paginateProjects(
  items: ProjectRecord[],
  page: number,
  pageSize = PROJECT_PAGE_SIZE,
): ProjectRecord[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function getProjectProgressStatus(
  project: ProjectRecord,
): ProgressStatus | undefined {
  if (project.status === 'done') {
    return 'success';
  }
  if (project.status === 'paused') {
    return 'paused';
  }
  return undefined;
}

export function getProjectRemainDays(project: ProjectRecord): number {
  const end = Date.parse(`${project.endAt}T00:00:00+08:00`);
  if (Number.isNaN(end)) {
    return 0;
  }
  const diff = end - Date.parse('2026-08-23T00:00:00+08:00');
  return Math.max(0, Math.ceil(diff / 86400000));
}
