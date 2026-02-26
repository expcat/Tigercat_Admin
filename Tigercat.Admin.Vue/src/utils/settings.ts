import { COLOR_PRESETS } from './constants';
import type { SettingItem } from './types';

/* ── 控件类型映射 ────────────────────────────── */

export type SettingControl =
  | { type: 'input' }
  | { type: 'switch' }
  | { type: 'select'; options: { label: string; value: string }[] };

/** 设置分组中文标签 */
export const SETTINGS_GROUP_LABELS: Record<string, string> = {
  site: '站点设置',
  auth: '认证安全',
  theme: '主题与个性化',
};

/** 特殊设置项的控件映射 */
export const SETTING_CONTROLS: Record<string, SettingControl> = {
  'auth.sessionTimeout': {
    type: 'select',
    options: [
      { label: '15 分钟', value: '15' },
      { label: '30 分钟', value: '30' },
      { label: '60 分钟', value: '60' },
      { label: '2 小时', value: '120' },
      { label: '8 小时', value: '480' },
      { label: '24 小时', value: '1440' },
    ],
  },
  'auth.maxAttempts': {
    type: 'select',
    options: [
      { label: '3 次', value: '3' },
      { label: '5 次', value: '5' },
      { label: '10 次', value: '10' },
      { label: '15 次', value: '15' },
      { label: '20 次', value: '20' },
    ],
  },
  'theme.mode': {
    type: 'select',
    options: [
      { label: '浅色', value: 'light' },
      { label: '深色', value: 'dark' },
      { label: '跟随系统', value: 'system' },
    ],
  },
  'theme.primaryColor': {
    type: 'select',
    options: COLOR_PRESETS.map((c) => ({
      label: `${c.label} (${c.value})`,
      value: c.value,
    })),
  },
  'theme.compactMode': {
    type: 'switch',
  },
};

/** 获取设置项的控件类型 */
export function getControl(key: string): SettingControl {
  return SETTING_CONTROLS[key] ?? { type: 'input' };
}

/** 获取 select 类型控件的选项列表 */
export function getControlOptions(
  key: string,
): { label: string; value: string }[] {
  const ctrl = SETTING_CONTROLS[key];
  return ctrl?.type === 'select' ? ctrl.options : [];
}

/** 按 key 前缀分组设置项 */
export function groupSettings(items: SettingItem[]): [string, SettingItem[]][] {
  const map: Record<string, SettingItem[]> = {};
  for (const item of items) {
    const prefix = item.key.split('.')[0] || 'other';
    (map[prefix] ??= []).push(item);
  }
  return Object.entries(map);
}
