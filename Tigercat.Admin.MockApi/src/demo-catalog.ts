export const DEMO_CATALOG_VERSION = '2026.11.19.1';

const DEMO_CATALOG_SEED = 20261119;
const DEMO_CATALOG_SEED_TIME = Date.parse('2026-11-19T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_USER_NAMES = [
  '张伟', '王芳', '李娜', '刘敏', '陈杰',
  '杨静', '赵磊', '黄丽', '周强', '吴霞',
  '徐明', '孙燕', '马俊', '朱婷', '郭涛',
];

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
