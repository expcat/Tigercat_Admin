import { defineConfig } from '@playwright/test';
import { shellProjects } from './e2e/playwright-projects';

const host = '127.0.0.1';
const apiPort = 55137;
const reactPort = 54174;
const vuePort = 54173;

export default defineConfig({
  testDir: './e2e',
  // hash 路由 + MockApi 专用用例只在 demo 配置运行，主套件为 history 路由 + 真实后端。
  testIgnore: /demo-static\.spec\.ts|exception-routes\.spec\.ts|auth-flows\.spec\.ts|tags-view\.spec\.ts|lock-screen\.spec\.ts|shell-watermark-theme\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  expect: {
    timeout: 10_000,
  },
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: shellProjects({
    reactName: 'react',
    vueName: 'vue',
    reactBaseURL: `http://${host}:${reactPort}`,
    vueBaseURL: `http://${host}:${vuePort}`,
  }),
});
