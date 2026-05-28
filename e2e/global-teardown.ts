import type { FullConfig } from '@playwright/test';
import { stopManagedServers } from './server-control';

async function globalTeardown(_config: FullConfig): Promise<void> {
  await stopManagedServers();
}

export default globalTeardown;
