import type { TreeNode } from '@expcat/tigercat-core';
import type { PermissionInfo } from './types';

/** Group labels for permission code prefixes. */
export const GROUP_LABELS: Record<string, string> = {
  dashboard: '仪表盘',
  user: '用户管理',
  role: '角色管理',
};

/** Group a flat permission list by the prefix before ':'. */
export function buildPermissionGroups(
  permissions: PermissionInfo[],
): Record<string, PermissionInfo[]> {
  const groups: Record<string, PermissionInfo[]> = {};
  for (const p of permissions) {
    const prefix = p.code.split(':')[0] || 'other';
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(p);
  }
  return groups;
}

export function buildPermissionTreeData(
  permissions: PermissionInfo[],
): TreeNode[] {
  return Object.entries(buildPermissionGroups(permissions)).map(
    ([group, groupPerms]) => ({
      key: `group:${group}`,
      label: GROUP_LABELS[group] || group,
      children: groupPerms.map((perm) => ({
        key: perm.id,
        label: perm.description
          ? `${perm.description} (${perm.code})`
          : perm.code,
        isLeaf: true,
      })),
    }),
  );
}

export function toggleGroupPerms(
  groupPerms: PermissionInfo[],
  target: number[],
): number[] {
  const ids = groupPerms.map((p) => p.id);
  const allChecked = ids.every((id) => target.includes(id));
  if (allChecked) {
    return target.filter((id) => !ids.includes(id));
  }
  const set = new Set(target);
  ids.forEach((id) => set.add(id));
  return [...set];
}

export function isGroupAllChecked(
  groupPerms: PermissionInfo[],
  target: number[],
): boolean {
  return groupPerms.every((p) => target.includes(p.id));
}

export function isGroupPartialChecked(
  groupPerms: PermissionInfo[],
  target: number[],
): boolean {
  const count = groupPerms.filter((p) => target.includes(p.id)).length;
  return count > 0 && count < groupPerms.length;
}
