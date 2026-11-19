export const DEMO_CATALOG_VERSION = '2026.11.19.2';

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
