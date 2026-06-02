import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const host = '127.0.0.1';
const apiPort = 55137;
const reactPort = 54174;
const vuePort = 54173;

const repoRoot = path.resolve(__dirname, '..');
const runtimeDir = path.join(repoRoot, 'test-results');
const stateFile = path.join(runtimeDir, 'e2e-servers.json');

type ManagedServer = {
  name: string;
  pid: number;
};

type ServerDefinition = {
  name: string;
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
  readyUrl: string;
};

function pnpmDefinitionArgs(args: string[]): Pick<ServerDefinition, 'command' | 'args'> {
  return process.platform === 'win32'
    ? { command: 'cmd.exe', args: ['/d', '/s', '/c', 'pnpm', ...args] }
    : { command: 'pnpm', args };
}

export function getManagedServers(): ServerDefinition[] {
  return [
    {
      name: 'api',
      command: 'dotnet',
      args: [
        'run',
        '--project',
        'Tigercat.Admin.Api/Tigercat.Admin.Api.csproj',
        '--no-launch-profile',
      ],
      readyUrl: `http://${host}:${apiPort}/api/health`,
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Development',
        ASPNETCORE_URLS: `http://${host}:${apiPort}`,
        Infrastructure__UseInMemory: 'true',
        Database__Provider: 'InMemory',
      },
    },
    {
      name: 'react',
      ...pnpmDefinitionArgs([
        '--filter',
        'tigercat-admin-react',
        'exec',
        'vite',
        '--host',
        host,
        '--port',
        String(reactPort),
      ]),
      readyUrl: `http://${host}:${reactPort}/`,
      env: {
        ...process.env,
        VITE_API_URL: `http://${host}:${apiPort}`,
      },
    },
    {
      name: 'vue',
      ...pnpmDefinitionArgs([
        '--filter',
        'tigercat-admin-vue',
        'exec',
        'vite',
        '--host',
        host,
        '--port',
        String(vuePort),
      ]),
      readyUrl: `http://${host}:${vuePort}/`,
      env: {
        ...process.env,
        VITE_API_URL: `http://${host}:${apiPort}`,
      },
    },
  ];
}

export async function startManagedServers(): Promise<void> {
  await mkdir(runtimeDir, { recursive: true });

  const startedServers: ManagedServer[] = [];

  try {
    for (const definition of getManagedServers()) {
      const child = spawn(definition.command, definition.args, {
        cwd: repoRoot,
        env: definition.env,
        detached: process.platform !== 'win32',
        stdio: 'ignore',
      });

      if (!child.pid) {
        throw new Error(`Failed to start ${definition.name} server.`);
      }

      child.unref();
      startedServers.push({ name: definition.name, pid: child.pid });
      await waitForHttpOk(definition.readyUrl, 120_000);
    }

    await writeFile(stateFile, JSON.stringify(startedServers, null, 2), 'utf8');
  } catch (error) {
    await stopManagedServers(startedServers);
    throw error;
  }
}

export async function stopManagedServers(
  servers?: ManagedServer[],
): Promise<void> {
  const managedServers = servers ?? (await readManagedServerState());

  for (const server of managedServers.reverse()) {
    try {
      if (process.platform === 'win32') {
        await killWindowsProcessTree(server.pid);
      } else {
        process.kill(-server.pid, 'SIGTERM');
      }
    } catch {
      // Ignore already-terminated processes.
    }
  }

  await rm(stateFile, { force: true });
}

async function killWindowsProcessTree(pid: number): Promise<void> {
  await new Promise<void>((resolve) => {
    const child = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
    });
    child.on('exit', () => resolve());
    child.on('error', () => resolve());
  });
}

async function readManagedServerState(): Promise<ManagedServer[]> {
  try {
    const raw = await readFile(stateFile, 'utf8');
    return JSON.parse(raw) as ManagedServer[];
  } catch {
    return [];
  }
}

async function waitForHttpOk(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for server: ${url}`);
}
