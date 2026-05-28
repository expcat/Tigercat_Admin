import { COLOR_PRESETS } from './constants';
import type { SettingItem } from './types';

/* ── 控件类型映射 ────────────────────────────── */

export type SettingControl =
  | { type: 'input' }
  | { type: 'switch' }
  | { type: 'select'; options: { label: string; value: string }[] }
  | { type: 'segmented'; options: { label: string; value: string }[] }
  | { type: 'color'; presets?: string[] }
  | { type: 'number'; min?: number; max?: number; step?: number };

/** 设置分组中文标签 */
export const SETTINGS_GROUP_LABELS: Record<string, string> = {
  site: '站点设置',
  auth: '认证安全',
  theme: '主题与个性化',
};

/** 特殊设置项的控件映射 */
export const SETTING_CONTROLS: Record<string, SettingControl> = {
  'auth.sessionTimeout': {
    type: 'number',
    min: 5,
    max: 1440,
    step: 5,
  },
  'auth.maxAttempts': {
    type: 'number',
    min: 1,
    max: 50,
    step: 1,
  },
  'theme.mode': {
    type: 'segmented',
    options: [
      { label: '浅色', value: 'light' },
      { label: '深色', value: 'dark' },
      { label: '跟随系统', value: 'system' },
    ],
  },
  'theme.primaryColor': {
    type: 'color',
    presets: COLOR_PRESETS.map((c) => c.value),
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
  return ctrl?.type === 'select' || ctrl?.type === 'segmented'
    ? ctrl.options
    : [];
}

export function getColorPresets(key: string): string[] {
  const ctrl = SETTING_CONTROLS[key];
  return ctrl?.type === 'color' ? (ctrl.presets ?? []) : [];
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
