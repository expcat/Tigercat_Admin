import {
  schemaToRouteRecords,
  type MenuRouteMeta,
  type MenuSchemaNode,
} from '@expcat/tigercat-core';
import {
  BUNDLED_MENU_SCHEMA_PAYLOAD,
  collectShellMenuNodes,
  normalizeShellPath,
} from './shell-navigation';
import type { MenuSchemaPayload } from './types';
import {
  SHELL_IFRAME_PAGE,
  SHELL_PAGE_MAP,
  type ShellPageComponent,
} from './page-map';

export type BoundSchemaRoute<T> = {
  key: string;
  path: string;
  childPath: string;
  component: T;
  permission?: string | string[];
  iframeSrc?: string;
  usesIframe: boolean;
  hideInBreadcrumb?: boolean;
  meta: MenuRouteMeta;
};

export function isSafeIframeSrc(src: string | undefined): src is string {
  if (!src) {
    return false;
  }
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('//')) {
    return false;
  }
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function resolveRecordPath(
  name: string,
  path: string,
  iframeSrc: string | undefined,
): string | undefined {
  const fromSchema = normalizeShellPath(path);
  if (fromSchema) {
    return fromSchema;
  }
  if (iframeSrc) {
    return `/${name}`;
  }
  return undefined;
}

export function routeGuardPermission(
  key: string,
  permission: string | string[] | undefined,
): string | string[] | undefined {
  if (key === 'home' || permission == null) {
    return undefined;
  }
  if (Array.isArray(permission)) {
    const codes = permission.filter((code) => code !== '');
    return codes.length > 0 ? codes : undefined;
  }
  return permission === '' ? undefined : permission;
}

export function bindSchemaPageMap<T>(
  nodes: readonly MenuSchemaNode[],
  pageMap: Record<string, T>,
  iframeFallback?: T,
): BoundSchemaRoute<T>[] {
  const records = schemaToRouteRecords(nodes);
  const result: BoundSchemaRoute<T>[] = [];
  const seenPaths = new Set<string>();

  for (const record of records) {
    const iframeSrc = isSafeIframeSrc(record.meta.iframeSrc)
      ? record.meta.iframeSrc
      : undefined;
    const path = resolveRecordPath(record.name, record.path, iframeSrc);
    if (!path || seenPaths.has(path)) {
      continue;
    }

    const hasPage = Object.prototype.hasOwnProperty.call(pageMap, record.name);
    const component = hasPage ? pageMap[record.name] : iframeFallback;
    if (component == null) {
      continue;
    }

    seenPaths.add(path);
    result.push({
      key: record.name,
      path,
      childPath: path.replace(/^\//, ''),
      component,
      permission: record.meta.permission,
      iframeSrc,
      usesIframe: !hasPage && Boolean(iframeSrc),
      hideInBreadcrumb: record.meta.hideInBreadcrumb,
      meta: record.meta,
    });
  }

  return result;
}

export function bindShellBusinessRoutes<T>(
  payload: MenuSchemaPayload,
  pageMap: Record<string, T>,
  iframeFallback?: T,
): BoundSchemaRoute<T>[] {
  const bundled = bindSchemaPageMap(
    collectShellMenuNodes(BUNDLED_MENU_SCHEMA_PAYLOAD),
    pageMap,
    iframeFallback,
  );
  const live = bindSchemaPageMap(
    collectShellMenuNodes(payload),
    pageMap,
    iframeFallback,
  );
  const byKey = new Map(bundled.map((route) => [route.key, route]));
  for (const route of live) {
    byKey.set(route.key, route);
  }
  return [...byKey.values()];
}

export function buildReactSchemaRoutes(
  payload: MenuSchemaPayload,
): BoundSchemaRoute<ShellPageComponent>[] {
  return bindShellBusinessRoutes<ShellPageComponent>(
    payload,
    SHELL_PAGE_MAP,
    SHELL_IFRAME_PAGE,
  );
}
