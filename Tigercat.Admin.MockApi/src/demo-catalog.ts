export const DEMO_CATALOG_VERSION = '2026.11.19.3';

const DEMO_CATALOG_SEED = 20261119;
const DEMO_CATALOG_SEED_TIME = Date.parse('2026-11-19T00:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_USER_NAMES = [
  '张伟', '王芳', '李娜', '刘敏', '陈杰',
  '杨静', '赵磊', '黄丽', '周强', '吴霞',
  '徐明', '孙燕', '马俊', '朱婷', '郭涛',
];
const DEMO_AUDIT_CATEGORIES = ['auth', 'user', 'task', 'system'] as const;
const DEMO_AUDIT_ACTORS = ['admin', 'editor', 'viewer', 'system'] as const;
const DEMO_AUDIT_TITLES = {
  auth: '登录会话核验',
  user: '用户状态检查',
  task: '任务进度更新',
  system: '系统配置巡检',
} as const;
const DEMO_NOTIFICATION_CONTENT = [
  { groupKey: 'ops', title: '导出任务已完成', description: '报表导出任务已经执行完成，可以前往任务面板查看处理结果。', toastType: 'success', linkUrl: '/tasks' },
  { groupKey: 'security', title: '异常登录已拦截', description: '系统已拦截一次来自陌生设备的登录尝试，请复核会话安全策略。', toastType: 'warning', linkUrl: '/settings' },
  { groupKey: 'release', title: '版本发布检查完成', description: '本次版本发布前的健康检查已全部通过，可以按计划继续发布。', toastType: 'success', linkUrl: '/audit-logs' },
  { groupKey: 'ops', title: '用户 u12 被禁用', description: '用户 u12 已被管理员禁用，相关会话将不再允许继续操作。', toastType: 'warning', linkUrl: '/audit-logs' },
  { groupKey: 'security', title: '登录密码策略已更新', description: '登录密码策略已经完成更新，请在系统设置中确认最新要求。', toastType: 'info', linkUrl: '/settings' },
  { groupKey: 'release', title: '发布审计记录已归档', description: '本次发布的审计记录已经归档，可在审计日志中按事件类型查询。', toastType: 'success', linkUrl: '/audit-logs' },
  { groupKey: 'ops', title: '任务负责人已调整', description: '缓存命中率排查任务已转交平台运维，新的负责人已收到处理提醒。', toastType: 'info', linkUrl: '/tasks' },
  { groupKey: 'security', title: '闲置会话已清理', description: '系统已清理超过时限的闲置会话，用户下次操作需要重新登录。', toastType: 'success', linkUrl: '/settings' },
  { groupKey: 'release', title: '回滚方案已复核', description: '发布回滚方案已经复核完成，关键步骤与负责人均已确认。', toastType: 'info', linkUrl: '/notifications' },
  { groupKey: 'ops', title: '健康检查出现异常', description: '一项健康检查连续两次超时，请前往任务面板跟进处理。', toastType: 'error', linkUrl: '/tasks' },
  { groupKey: 'security', title: '权限变更待复核', description: '内容编辑角色的权限发生变更，请安全管理员完成复核。', toastType: 'warning', linkUrl: '/audit-logs' },
  { groupKey: 'release', title: '发布说明已补充', description: '本次发布说明已补充数据库变更与回滚注意事项，可在通知中心查看。', toastType: 'success', linkUrl: '/notifications' },
  { groupKey: 'ops', title: '数据导入已完成', description: '用户数据导入任务已经处理完成，请在任务面板确认成功与失败数量。', toastType: 'success', linkUrl: '/tasks' },
  { groupKey: 'security', title: '审计保留策略待确认', description: '审计日志保留策略仍为默认值，请在系统设置中确认保留天数。', toastType: 'info', linkUrl: '/settings' },
  { groupKey: 'release', title: '新版本验证已完成', description: '新版本核心流程验证已经完成，发布窗口可以继续推进。', toastType: 'success', linkUrl: '/notifications' },
] as const;

const DEMO_TICKET_TITLES = [
  '导出 Excel 时列顺序不一致',
  '增加项目按负责人筛选',
  '如何重置锁定账号',
  '通知已读状态刷新后丢失',
  '支持看板任务批量指派',
  '审计导出字段如何配置',
  '日历跨月视图显示异常',
  '媒体库支持按格式筛选',
  '报表导出权限如何申请',
  '角色权限保存后未生效',
  '项目里程碑希望支持复制',
  '密码复杂度规则如何配置',
  '导入失败行无法下载',
  '工单列表增加优先级筛选',
  '任务提醒时间如何设置',
] as const;
const DEMO_TICKET_STATUSES = ['open', 'accepted', 'progress', 'resolved', 'closed'] as const;
const DEMO_TICKET_PRIORITIES = ['high', 'medium', 'low'] as const;
const DEMO_TICKET_CATEGORIES = ['缺陷', '需求', '咨询'] as const;
const DEMO_PEOPLE = ['王小虎', '李工', '张运维', '陈测试', '赵敏', '孙莉'] as const;
const DEMO_PROJECT_NAMES = [
  '运营周报自动化',
  '权限审计专项',
  '客户门户改版',
  '数据质量看板',
  '发布流程优化',
  '组件文档站点',
  '移动巡检助手',
  '消息模板治理',
  '搜索体验升级',
  '报表订阅服务',
] as const;
const DEMO_PROJECT_STATUSES = ['planning', 'active', 'paused', 'done'] as const;
const DEMO_PROJECT_DEPARTMENTS = ['平台研发部', '安全治理组', '客户成功', '数据分析', '基础设施'] as const;
const DEMO_CALENDAR_CONTENT = [
  { title: '运营指标对齐', type: 'meeting', start: '09:20', end: '09:50', location: '会议室 A' },
  { title: '权限矩阵评审', type: 'review', start: '10:30', end: '11:30', location: '会议室 B' },
  { title: '报表服务发布', type: 'release', start: '20:00', end: '21:00', location: '生产环境' },
  { title: '备份巡检提醒', type: 'reminder', start: '16:30', end: '17:00', location: '—' },
  { title: '项目风险同步', type: 'meeting', start: '14:00', end: '14:45', location: '线上 · 腾讯会议' },
  { title: '看板交互评审', type: 'review', start: '15:00', end: '16:00', location: '会议室 A' },
  { title: '通知服务发布', type: 'release', start: '19:30', end: '20:30', location: '生产环境' },
  { title: '审计留存复核提醒', type: 'reminder', start: '11:00', end: '11:30', location: '—' },
  { title: '媒体需求澄清', type: 'meeting', start: '10:00', end: '10:45', location: '会议室 C' },
  { title: '导入结果页评审', type: 'review', start: '13:30', end: '14:30', location: '会议室 B' },
  { title: '搜索服务发布', type: 'release', start: '20:30', end: '21:30', location: '生产环境' },
  { title: '月度账单核对提醒', type: 'reminder', start: '17:00', end: '17:30', location: '—' },
] as const;
const DEMO_TASK_CONTENT = [
  { title: '补充演示数据验收清单', description: '按用户、工单、项目和日历逐项核对演示种子。', assignee: '王小虎', priority: 'medium', status: 'backlog', estimateHours: 3 },
  { title: '复核项目成员展示', description: '确认新增项目复用现有成员、角色和颜色。', assignee: '赵敏', priority: 'low', status: 'todo', estimateHours: 2 },
  { title: '排查工单筛选边界', description: '验证五种状态切换后列表与详情保持一致。', assignee: '李工', priority: 'high', status: 'doing', estimateHours: 5 },
  { title: '评审日历跨月展示', description: '检查今天、未来两周和跨月事件的展示。', assignee: '孙莉', priority: 'medium', status: 'review', estimateHours: 4 },
  { title: '整理媒体图库说明', description: '补充静态演示图片与真实上传能力的区别。', assignee: '陈测试', priority: 'low', status: 'done', estimateHours: 2 },
  { title: '完善发布前检查记录', description: '将发布窗口和健康检查结果写入任务说明。', assignee: '张运维', priority: 'high', status: 'doing', estimateHours: 3 },
] as const;

type DemoProjectMember = {
  id: string;
  name: string;
  role: string;
  color: string;
};

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function localDateAt(clock: Date, dayOffset: number, hour = 0, minute = 0) {
  return new Date(clock.getFullYear(), clock.getMonth(), clock.getDate() + dayOffset, hour, minute);
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatDemoLocalDate(clock: Date, dayOffset = 0) {
  return formatLocalDate(localDateAt(clock, dayOffset));
}

function formatLocalMinute(date: Date) {
  return `${formatLocalDate(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDemoUsers() {
  const random = mulberry32(DEMO_CATALOG_SEED);
  return Array.from({ length: 45 }, (_, offset) => {
    const sequence = offset + 1;
    const jitterMs = Math.floor(random() * DAY_MS);
    return {
      id: sequence + 3,
      username: `u${String(sequence).padStart(2, '0')}`,
      displayName: DEMO_USER_NAMES[offset % DEMO_USER_NAMES.length],
      status: sequence % 7 === 0 ? 1 : 0,
      avatarMediaId: null,
      avatarUrl: null,
      createdAt: new Date(DEMO_CATALOG_SEED_TIME - sequence * 2 * DAY_MS + jitterMs).toISOString(),
      updatedAt: null,
      roleIds: sequence % 2 === 1 ? [2] : [3],
    };
  });
}

function demoAuditDescription(
  category: (typeof DEMO_AUDIT_CATEGORIES)[number],
  sequence: number,
  actor: string,
) {
  switch (category) {
    case 'auth':
      return `${actor} 完成了第 ${sequence} 次登录会话核验，认证结果正常。`;
    case 'user':
      return `管理员检查了用户 u${String((sequence % 45) + 1).padStart(2, '0')} 的资料与启停状态。`;
    case 'task':
      return `${actor} 更新了演示任务 ${sequence} 的执行进度并留下处理记录。`;
    case 'system':
      return `系统完成了第 ${sequence} 项配置巡检，未发现异常。`;
  }
}

export function generateDemoAuditLogs() {
  return Array.from({ length: 48 }, (_, offset) => {
    const sequence = offset + 1;
    const suffix = String(sequence).padStart(2, '0');
    const category = DEMO_AUDIT_CATEGORIES[offset % DEMO_AUDIT_CATEGORIES.length];
    const actor = DEMO_AUDIT_ACTORS[offset % DEMO_AUDIT_ACTORS.length];
    return {
      id: `audit-gen-${suffix}`,
      stream: category === 'auth' ? 'stream:auth' : 'stream:admin',
      category,
      eventType: `demo.catalog.${category}.${suffix}`,
      occurredAtUtc: new Date(DEMO_CATALOG_SEED_TIME - sequence * HOUR_MS).toISOString(),
      traceId: `demo-trace-${suffix}`,
      title: `${DEMO_AUDIT_TITLES[category]} ${suffix}`,
      description: demoAuditDescription(category, sequence, actor),
      actor,
      data: { mode: 'static-demo', actor },
    };
  });
}

export function generateDemoNotifications() {
  return DEMO_NOTIFICATION_CONTENT.map((content, offset) => {
    const createdAt = new Date(DEMO_CATALOG_SEED_TIME - (offset + 1) * HOUR_MS).toISOString();
    const read = offset % 2 === 1;
    const readAt = read ? new Date(Date.parse(createdAt) + HOUR_MS / 2).toISOString() : null;
    return {
      id: `notice-gen-${String(offset + 1).padStart(2, '0')}`,
      ...content,
      time: createdAt,
      createdAt,
      read,
      readAt,
      updatedAt: readAt,
      meta: {
        source: 'demo-catalog',
        severity: content.toastType === 'warning' || content.toastType === 'error' ? 'medium' : 'low',
      },
    };
  });
}

export function generateDemoTickets(clock: Date) {
  return DEMO_TICKET_TITLES.map((title, offset) => {
    const ticketNumber = 3001 + offset;
    const suffix = String(ticketNumber);
    const ageDays = Math.floor(offset * 20 / (DEMO_TICKET_TITLES.length - 1));
    const createdAt = formatLocalMinute(new Date(clock.getTime() - ageDays * DAY_MS - 3 * HOUR_MS));
    const updatedAt = formatLocalMinute(new Date(clock.getTime() - ageDays * DAY_MS - HOUR_MS));
    const requester = DEMO_PEOPLE[offset % DEMO_PEOPLE.length];
    const status = DEMO_TICKET_STATUSES[offset % DEMO_TICKET_STATUSES.length];
    return {
      id: `TK-${suffix}`,
      title,
      requester,
      category: DEMO_TICKET_CATEGORIES[offset % DEMO_TICKET_CATEGORIES.length],
      priority: DEMO_TICKET_PRIORITIES[offset % DEMO_TICKET_PRIORITIES.length],
      status,
      createdAt,
      updatedAt,
      satisfaction: status === 'resolved' || status === 'closed' ? 4 + offset % 2 : 0,
      description: `${title}，请在演示环境中核对复现步骤、影响范围与处理结论。`,
      messages: [
        { id: `m-${suffix}-1`, content: `你好，请协助跟进「${title}」。`, direction: 'other' as const, time: createdAt },
        ...offset % 2 === 0
          ? [{ id: `m-${suffix}-2`, content: '已记录问题，会在更新处理进展后同步给你。', direction: 'self' as const, time: updatedAt }]
          : [],
      ],
    };
  });
}

export function generateDemoProjects(clock: Date, members: DemoProjectMember[]) {
  return DEMO_PROJECT_NAMES.map((name, offset) => {
    const owner = members[offset % members.length];
    const partner = members[(offset + 2) % members.length];
    const status = DEMO_PROJECT_STATUSES[offset % DEMO_PROJECT_STATUSES.length];
    return {
      id: String(1009 + offset),
      name,
      summary: `${name}的演示项目，覆盖计划、协作、里程碑与活动记录。`,
      owner: owner.name,
      department: DEMO_PROJECT_DEPARTMENTS[offset % DEMO_PROJECT_DEPARTMENTS.length],
      status,
      progress: status === 'done' ? 100 : status === 'active' ? 45 + offset * 3 : status === 'paused' ? 36 : 12 + offset,
      milestone: status === 'done' ? 3 : offset % 3,
      budget: 24 + offset * 6,
      startAt: formatDemoLocalDate(clock, -90 + offset * 7),
      endAt: formatDemoLocalDate(clock, status === 'done' ? -7 : 30 + offset * 7),
      members: [owner, partner],
      activities: [
        { key: 'a1', label: '今天 09:30', content: `${owner.name} 更新了项目计划与当前进度`, color: owner.color },
        { key: 'a2', label: '昨天 16:00', content: `${partner.name} 完成了协同事项复核`, color: partner.color },
      ],
    };
  });
}

export function generateDemoCalendarEvents(clock: Date) {
  return DEMO_CALENDAR_CONTENT.map((event, offset) => ({
    id: `e${offset + 6}`,
    date: formatDemoLocalDate(clock, offset === 11 ? 12 : offset),
    ...event,
  }));
}

export function generateDemoTasks(clock: Date) {
  return DEMO_TASK_CONTENT.map((item, offset) => ({
    id: `task-catalog-${pad2(offset + 1)}`,
    ...item,
    dueAt: `${formatDemoLocalDate(clock, offset + 2)}T10:00:00.000Z`,
    blocked: false,
    blockedReason: null,
    completionNote: item.status === 'done' ? '演示任务已完成。' : null,
    createdBy: 'system',
    createdAt: clock.toISOString(),
    updatedAt: null,
    completedAt: item.status === 'done' ? clock.toISOString() : null,
  }));
}

export function generateDemoMedia() {
  return Array.from({ length: 8 }, (_, offset) => {
    const suffix = pad2(offset + 1);
    return {
      id: offset + 4,
      publicId: `demo-illustration-${suffix}`,
      name: `demo-illustration-${suffix}.png`,
      sizeBytes: 4096 + offset * 137,
    };
  });
}
