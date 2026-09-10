import type {
  ApproverSource,
  ApproverResolveContext,
  WorkflowTimelineActor,
} from '@expcat/tigercat-core';

export type MockContactUser = {
  id: string;
  name: string;
  username: string;
  deptId: string;
  roleKeys: string[];
  groupKeys: string[];
  managerId?: string;
};

export type MockContactDept = {
  id: string;
  name: string;
  leaderId: string;
  parentId?: string;
};

export type MockContactRole = { key: string; name: string };
export type MockContactGroup = { key: string; name: string };

export const MOCK_CONTACT_ROLES: MockContactRole[] = [
  { key: 'admin', name: '系统管理员' },
  { key: 'staff', name: '员工' },
  { key: 'manager', name: '经理' },
  { key: 'director', name: '总监' },
  { key: 'finance', name: '财务' },
  { key: 'hr', name: '人事' },
];

export const MOCK_CONTACT_GROUPS: MockContactGroup[] = [
  { key: 'ops', name: '运维组' },
  { key: 'managers', name: '管理组' },
  { key: 'finance', name: '财务组' },
  { key: 'hr', name: '人事组' },
];

export const MOCK_CONTACT_DEPTS: MockContactDept[] = [
  { id: 'company', name: '公司', leaderId: 'li' },
  { id: 'ops', name: '运维部', leaderId: 'li', parentId: 'company' },
  { id: 'finance', name: '财务部', leaderId: 'zhao', parentId: 'company' },
  { id: 'hr', name: '人事部', leaderId: 'fang', parentId: 'company' },
];

export const MOCK_CONTACT_USERS: MockContactUser[] = [
  {
    id: 'admin',
    name: '管理员',
    username: 'admin',
    deptId: 'ops',
    roleKeys: ['admin', 'staff'],
    groupKeys: ['ops'],
    managerId: 'wang',
  },
  {
    id: 'demo',
    name: '演示用户',
    username: 'demo',
    deptId: 'ops',
    roleKeys: ['staff'],
    groupKeys: ['ops'],
    managerId: 'admin',
  },
  {
    id: 'wang',
    name: '王经理',
    username: 'wang',
    deptId: 'ops',
    roleKeys: ['manager'],
    groupKeys: ['managers'],
    managerId: 'li',
  },
  {
    id: 'li',
    name: '李总监',
    username: 'li',
    deptId: 'ops',
    roleKeys: ['director'],
    groupKeys: ['managers'],
  },
  {
    id: 'chen',
    name: '陈财务',
    username: 'chen',
    deptId: 'finance',
    roleKeys: ['finance'],
    groupKeys: ['finance'],
    managerId: 'zhao',
  },
  {
    id: 'zhao',
    name: '赵主管',
    username: 'zhao',
    deptId: 'finance',
    roleKeys: ['manager', 'finance'],
    groupKeys: ['managers', 'finance'],
    managerId: 'li',
  },
  {
    id: 'fang',
    name: '方人事',
    username: 'fang',
    deptId: 'hr',
    roleKeys: ['hr'],
    groupKeys: ['hr'],
    managerId: 'li',
  },
];

const usersById = new Map(MOCK_CONTACT_USERS.map((user) => [user.id, user]));
const usersByUsername = new Map(MOCK_CONTACT_USERS.map((user) => [user.username.toLowerCase(), user]));
const deptsById = new Map(MOCK_CONTACT_DEPTS.map((dept) => [dept.id, dept]));

export function contactActor(user: MockContactUser): WorkflowTimelineActor {
  return { id: user.id, name: user.name };
}

export function findContactUser(idOrName?: string | null): MockContactUser | undefined {
  if (!idOrName) return undefined;
  const key = idOrName.trim();
  if (!key) return undefined;
  return (
    usersById.get(key) ??
    usersByUsername.get(key.toLowerCase()) ??
    MOCK_CONTACT_USERS.find((user) => user.name === key)
  );
}

export function contactActorFromId(idOrName?: string | null): WorkflowTimelineActor {
  const user = findContactUser(idOrName);
  if (user) return contactActor(user);
  const fallback = (idOrName ?? '').trim() || 'unknown';
  return { id: fallback, name: fallback };
}

function uniqueActors(actors: WorkflowTimelineActor[]): WorkflowTimelineActor[] {
  const seen = new Set<string>();
  const next: WorkflowTimelineActor[] = [];
  for (const actor of actors) {
    const id = actor.id == null ? '' : String(actor.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    next.push(actor);
  }
  return next;
}

function readStarterPickIds(formValues: Record<string, unknown> | undefined): string[] {
  if (!formValues) return [];
  const raw = formValues.starterPick ?? formValues.starterPicks ?? formValues.pickedApprovers;
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item ?? '').trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
  return [];
}

function resolveOne(source: ApproverSource, ctx: ApproverResolveContext): WorkflowTimelineActor[] {
  switch (source.type) {
    case 'fixed':
      return uniqueActors(source.actors.map((actor) => contactActorFromId(String(actor.id ?? actor.name ?? ''))));
    case 'self':
      return [contactActorFromId(ctx.starter.id != null ? String(ctx.starter.id) : ctx.starter.name)];
    case 'starter_pick':
      return uniqueActors(readStarterPickIds(ctx.formValues).map((id) => contactActorFromId(id)));
    case 'role':
      return MOCK_CONTACT_USERS.filter((user) => user.roleKeys.includes(source.key)).map(contactActor);
    case 'group':
      return MOCK_CONTACT_USERS.filter((user) => user.groupKeys.includes(source.key)).map(contactActor);
    case 'dept_leader': {
      const starter = findContactUser(
        ctx.starter.id != null ? String(ctx.starter.id) : ctx.starter.name,
      );
      if (!starter) return [];
      let dept = deptsById.get(starter.deptId);
      const climbs = Math.max((source.level ?? 1) - 1, 0);
      for (let i = 0; i < climbs && dept?.parentId; i += 1) {
        dept = deptsById.get(dept.parentId);
      }
      if (!dept?.leaderId) return [];
      return [contactActorFromId(dept.leaderId)];
    }
    case 'manager_chain': {
      const starter = findContactUser(
        ctx.starter.id != null ? String(ctx.starter.id) : ctx.starter.name,
      );
      if (!starter) return [];
      const upTo = Math.max(source.upTo ?? 3, 1);
      const chain: WorkflowTimelineActor[] = [];
      const seen = new Set<string>([starter.id]);
      let current = starter.managerId ? usersById.get(starter.managerId) : undefined;
      while (current && chain.length < upTo) {
        if (seen.has(current.id)) break;
        seen.add(current.id);
        chain.push(contactActor(current));
        current = current.managerId ? usersById.get(current.managerId) : undefined;
      }
      return chain;
    }
    default:
      return [];
  }
}

export function resolveApprovers(
  source: ApproverSource | ApproverSource[] | undefined,
  ctx: ApproverResolveContext,
): WorkflowTimelineActor[] {
  if (!source) return [];
  const list = Array.isArray(source) ? source : [source];
  return uniqueActors(list.flatMap((item) => resolveOne(item, ctx)));
}

export function listMockContacts() {
  return {
    users: MOCK_CONTACT_USERS.map((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      deptId: user.deptId,
      deptName: deptsById.get(user.deptId)?.name ?? user.deptId,
      roleKeys: [...user.roleKeys],
      groupKeys: [...user.groupKeys],
      managerId: user.managerId ?? null,
    })),
    depts: MOCK_CONTACT_DEPTS.map((dept) => ({ ...dept })),
    roles: MOCK_CONTACT_ROLES.map((role) => ({ ...role })),
    groups: MOCK_CONTACT_GROUPS.map((group) => ({ ...group })),
  };
}

export function isApproverSourceLike(value: unknown): value is ApproverSource {
  if (typeof value !== 'object' || value == null || !('type' in value)) return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === 'fixed' ||
    type === 'self' ||
    type === 'starter_pick' ||
    type === 'role' ||
    type === 'group' ||
    type === 'dept_leader' ||
    type === 'manager_chain'
  );
}
