import { defineConfig, devices } from '@playwright/test';

const host = '127.0.0.1';
const reactPort = 55174;
const vuePort = 55173;

export default defineConfig({
  testDir: './e2e',
  testMatch: /demo-static\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: `pnpm --filter tigercat-admin-react exec cross-env VITE_TIGERCAT_DEMO=true VITE_TIGERCAT_ROUTER_MODE=hash VITE_TIGERCAT_BASE_PATH=/ vite preview --host ${host} --port ${reactPort}`,
      url: `http://${host}:${reactPort}/`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `pnpm --filter tigercat-admin-vue exec cross-env VITE_TIGERCAT_DEMO=true VITE_TIGERCAT_ROUTER_MODE=hash VITE_TIGERCAT_BASE_PATH=/ vite preview --host ${host} --port ${vuePort}`,
      url: `http://${host}:${vuePort}/`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'react-demo',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://${host}:${reactPort}`,
      },
    },
    {
      name: 'vue-demo',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://${host}:${vuePort}`,
      },
    },
  ],
});
