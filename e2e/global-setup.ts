import type { FullConfig } from '@playwright/test';
import { startManagedServers } from './server-control';

async function globalSetup(_config: FullConfig): Promise<void> {
  await startManagedServers();
}

export default globalSetup;
