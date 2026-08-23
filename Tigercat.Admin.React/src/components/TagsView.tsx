import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  Tag,
} from '@expcat/tigercat-react';
import { MoreHorizontalIcon } from './Icons';
import {
  getShellPageTitle,
  type ShellPageKey,
} from '../utils/shell-navigation';
import { TAGS_VIEW_HOME_KEY } from '../utils/tags-view';

interface TagsViewProps {
  keys: ShellPageKey[];
  activeKey: ShellPageKey;
  onSelect: (key: ShellPageKey) => void;
  onClose: (key: ShellPageKey) => void;
  onCloseCurrent: () => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
}

export function TagsView({
  keys,
  activeKey,
  onSelect,
  onClose,
  onCloseCurrent,
  onCloseOthers,
  onCloseAll,
}: TagsViewProps) {
  const canCloseCurrent = activeKey !== TAGS_VIEW_HOME_KEY;
  const canCloseOthers = keys.some(
    (key) => key !== TAGS_VIEW_HOME_KEY && key !== activeKey,
  );
  const canCloseAll = keys.some((key) => key !== TAGS_VIEW_HOME_KEY);

  return (
    <div
      data-testid="shell-tags-view"
      className="p2-tags-view flex min-w-0 w-full shrink-0 items-center gap-1 border-b border-(--tiger-border,#e2e8f0) bg-(--tiger-bg-card,#ffffff) px-3 py-1.5 md:px-6">
      <div
        role="tablist"
        aria-label="已打开的页面"
        className="p2-tags-view-list flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain">
        {keys.map((key) => {
          const title = getShellPageTitle(key);
          const isActive = key === activeKey;
          const pinned = key === TAGS_VIEW_HOME_KEY;

          return (
            <span
              key={key}
              data-testid={`shell-tag-${key}`}
              data-active={isActive ? 'true' : 'false'}
              role="tab"
              tabIndex={0}
              aria-selected={isActive}
              title={title}
              className="shrink-0 cursor-pointer"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('button')) {
                  return;
                }
                onSelect(key);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(key);
                }
              }}>
              <Tag
                variant={isActive ? 'primary' : 'default'}
                size="sm"
                closable={!pinned}
                closeAriaLabel={`关闭${title}`}
                className="whitespace-nowrap"
                onClose={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onClose(key);
                }}>
                {title}
              </Tag>
            </span>
          );
        })}
      </div>
      <Dropdown
        trigger="click"
        placement="bottom-end"
        showArrow={false}
        renderTrigger={() => (
          <Button
            variant="ghost"
            size="sm"
            aria-label="标签操作"
            data-testid="shell-tags-view-actions"
            className="h-8 w-8 !p-0 shrink-0">
            <MoreHorizontalIcon size={16} />
          </Button>
        )}>
        <DropdownMenu className="w-40 max-w-[calc(100vw-2rem)]">
          <DropdownItem disabled={!canCloseCurrent} onClick={onCloseCurrent}>
            关闭当前
          </DropdownItem>
          <DropdownItem disabled={!canCloseOthers} onClick={onCloseOthers}>
            关闭其他
          </DropdownItem>
          <DropdownItem disabled={!canCloseAll} onClick={onCloseAll}>
            关闭全部
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}
