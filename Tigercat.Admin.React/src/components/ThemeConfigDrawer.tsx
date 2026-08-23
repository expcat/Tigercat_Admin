import {
  Drawer,
  Segmented,
  Switch,
  Text,
} from '@expcat/tigercat-react';
import { ColorSwatch } from '@expcat/tigercat-react/ColorSwatch';
import { COLOR_PRESETS } from '../utils/constants';
import type { ThemeMode, ThemePreferences } from '../utils/types';

const MODE_OPTIONS = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' },
];

const SWATCH_COLORS = COLOR_PRESETS.map((preset) => ({
  value: preset.value,
  label: preset.label,
}));

interface ThemeConfigDrawerProps {
  open: boolean;
  themePrefs: ThemePreferences;
  onClose: () => void;
  onUpdateTheme: (prefs: ThemePreferences) => void;
}

export function ThemeConfigDrawer({
  open,
  themePrefs,
  onClose,
  onUpdateTheme,
}: ThemeConfigDrawerProps) {
  const patchTheme = (patch: Partial<ThemePreferences>) => {
    onUpdateTheme({ ...themePrefs, ...patch });
  };

  return (
    <Drawer
      placement="right"
      open={open}
      title="主题配置"
      width="360px"
      mask
      maskClosable
      onClose={onClose}>
      <div data-testid="shell-theme-config-drawer" className="space-y-6">
        <div>
          <Text weight="medium" className="mb-2 block">
            外观
          </Text>
          <Segmented
            value={themePrefs.mode}
            options={MODE_OPTIONS}
            onChange={(value) => patchTheme({ mode: String(value) as ThemeMode })}
            block
          />
        </div>

        <div>
          <Text weight="medium" className="mb-2 block">
            主色
          </Text>
          <ColorSwatch
            value={themePrefs.primaryColor}
            colors={SWATCH_COLORS}
            columns={4}
            ariaLabel="选择主题主色"
            onChange={(value) => patchTheme({ primaryColor: value })}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Text weight="medium" className="block">
              紧凑密度
            </Text>
            <Text size="sm" color="secondary">
              收紧内容区内边距，侧栏默认折叠
            </Text>
          </div>
          <Switch
            checked={themePrefs.compactMode}
            onChange={(checked) => patchTheme({ compactMode: checked })}
          />
        </div>
      </div>
    </Drawer>
  );
}
