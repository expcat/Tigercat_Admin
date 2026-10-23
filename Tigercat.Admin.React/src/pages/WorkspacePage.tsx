import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Button } from '@expcat/tigercat-react/Button';
import { Card } from '@expcat/tigercat-react/Card';
import { Text } from '@expcat/tigercat-react/Text';
import { PageHeader } from '../components/PageHeader';
import { ClipboardIcon } from '../components/Icons';
import { usePermission } from '../utils/permission';
import { APPROVAL_DEMO_ACTOR_EVENT } from '../utils/approvals';
import { NOTIFICATIONS_CHANGED_EVENT } from '../utils/notifications';
import { createWorkspaceState, fetchWorkspaceSection, WORKSPACE_SECTIONS } from '../utils/workspace';
import type { WorkspaceSectionKey } from '../utils/types';

export default function WorkspacePage() {
  const { username = '' } = useOutletContext<{ username?: string }>();
  const { has, loaded } = usePermission();
  const canViewTasks = has('task:view');
  const canViewNotifications = has('notification:view');
  const [sections, setSections] = useState(createWorkspaceState);
  const requests = useRef<Partial<Record<WorkspaceSectionKey, AbortController>>>({});

  const loadSection = useCallback(async (key: WorkspaceSectionKey) => {
    requests.current[key]?.abort();
    const controller = new AbortController();
    requests.current[key] = controller;
    setSections(previous => ({ ...previous, [key]: { items: [], total: null, note: '', loading: true, error: '' } }));
    if (!username || (key === 'tasks' && !canViewTasks) || (key === 'notifications' && !canViewNotifications)) {
      setSections(previous => ({ ...previous, [key]: { ...previous[key], loading: false } }));
      return;
    }
    try {
      const data = await fetchWorkspaceSection(key, username, controller.signal);
      if (!controller.signal.aborted) setSections(previous => ({ ...previous, [key]: { ...data, loading: false, error: '' } }));
    } catch (error) {
      if (!controller.signal.aborted) setSections(previous => ({ ...previous, [key]: {
        items: [], total: null, loading: false, error: error instanceof Error ? error.message : '加载失败，请重试。',
      } }));
    }
  }, [username, canViewTasks, canViewNotifications]);

  useEffect(() => {
    WORKSPACE_SECTIONS.forEach(section => void loadSection(section.key));
    return () => Object.values(requests.current).forEach(controller => controller.abort());
  }, [loadSection]);

  useEffect(() => {
    const syncActor = () => void loadSection('approvals');
    const syncNotifications = () => void loadSection('notifications');
    window.addEventListener(APPROVAL_DEMO_ACTOR_EVENT, syncActor);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, syncNotifications);
    return () => {
      window.removeEventListener(APPROVAL_DEMO_ACTOR_EVENT, syncActor);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, syncNotifications);
    };
  }, [loadSection]);

  return (
    <div className="space-y-6">
      <PageHeader title="我的工作台" subtitle={`当前账号：${username || '尚未就绪'}。查看任务与共享协作信息，各块可独立刷新。`} icon={<ClipboardIcon size={24} />} />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        {WORKSPACE_SECTIONS.map(section => {
          const state = sections[section.key];
          const permitted = !section.permission || has(section.permission);
          return (
            <section key={section.key} aria-label={section.title} className="min-w-0">
              <Card header={<div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">{section.title}</h2>
                {permitted && <Button size="sm" variant="outline" disabled={state.loading} onClick={() => void loadSection(section.key)}>{state.error ? '重试' : '刷新'}{section.title}</Button>}
              </div>}>
                <div className="space-y-3">
                  <Text tag="p" size="sm" color="secondary">{section.description}</Text>
                  {!permitted ? <Text tag="p" role="status">{loaded ? `需要 ${section.permission} 权限，未请求此数据。` : '正在确认访问权限…'}</Text>
                    : state.loading ? <Text tag="p" role="status">正在加载{section.title}…</Text>
                    : state.error ? <div role="alert"><Text color="danger">{state.error}</Text></div>
                    : <>
                      {state.note && <Text tag="p" size="sm" color="secondary">{state.note}</Text>}
                      {state.total !== null && <Text tag="p" size="sm" role="status">显示 {state.items.length} / 共 {state.total} 条</Text>}
                      {state.items.length ? <ul className="divide-y divide-(--tiger-border)" aria-label={`${section.title}列表`}>
                        {state.items.map(item => <li key={item.id} className="space-y-1 break-words py-3">
                          {item.href && (!item.permission || has(item.permission))
                            ? <Link className="p2-text-primary underline" to={item.href}>{item.title}</Link>
                            : <Text tag="p">{item.title}</Text>}
                          <Text tag="p" size="sm" color="secondary">{item.description}</Text>
                          {item.permission && !has(item.permission) && <Text tag="p" size="sm" color="secondary">目标需要 {item.permission} 权限</Text>}
                        </li>)}
                      </ul> : state.total !== null && <Text tag="p">当前范围内暂无记录。</Text>}
                    </>}
                  {permitted && <Link className="p2-text-primary underline inline-block" to={section.href}>打开{section.key === 'tasks' ? '任务面板' : section.key === 'notifications' ? '通知中心' : section.key === 'calendar' ? '团队日历' : '审批中心'}</Link>}
                </div>
              </Card>
            </section>
          );
        })}
      </div>
    </div>
  );
}
