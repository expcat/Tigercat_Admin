import { Footer } from '@expcat/tigercat-react/Footer';
import { Icon } from '@expcat/tigercat-react/Icon';
import { Space } from '@expcat/tigercat-react/Space';
import { Tag } from '@expcat/tigercat-react/Tag';
import { Text } from '@expcat/tigercat-react/Text';

export function ShellFooter() {
  return (
    <Footer
      data-testid="shell-footer"
      className="mt-8 border-t border-(--tiger-border,#e2e8f0) bg-transparent px-0 py-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Space size="sm" align="center" wrap>
          <Icon name="dashboard" size="sm" />
          <Text size="sm" color="secondary">
            Tigercat Admin
          </Text>
          <Tag size="sm" variant="default">
            UI 2.3.1
          </Tag>
        </Space>
        <Text size="sm" color="secondary">
          演示蓝本 · 非生产数据
        </Text>
      </div>
    </Footer>
  );
}
