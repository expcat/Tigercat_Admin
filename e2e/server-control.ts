import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';

export const host = '127.0.0.1';
export const apiPort = 55137;
export const reactPort = 54174;
export const vuePort = 54173;

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
        '--strictPort',
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
        '--strictPort',
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
      await assertPortAvailable(definition.name, Number(new URL(definition.readyUrl).port));
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
      await waitForHttpOk(definition.readyUrl, 120_000, child);
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

  const failures: string[] = [];

  for (const server of [...managedServers].reverse()) {
    try {
      await stopManagedServer(server);
    } catch (error) {
      failures.push(`${server.name} (pid ${server.pid}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Managed server cleanup failed: ${failures.join('; ')}. State file retained: ${stateFile}`);
  }

  await rm(stateFile, { force: true });
}

async function stopManagedServer(server: ManagedServer): Promise<void> {
  if (process.platform === 'win32') {
    await killWindowsProcessTree(server.pid);
  } else {
    signalPosixProcessGroup(server.pid, 'SIGTERM');
    if (!(await waitForProcessTreeExit(server.pid, 5_000))) {
      signalPosixProcessGroup(server.pid, 'SIGKILL');
    }
  }

  if (!(await waitForProcessTreeExit(server.pid, 5_000))) {
    throw new Error('process tree is still running after SIGKILL');
  }
}

function signalPosixProcessGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
  }
}

function processTreeIsRunning(pid: number): boolean {
  try {
    process.kill(process.platform === 'win32' ? pid : -pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false;
    throw error;
  }
}

async function waitForProcessTreeExit(pid: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!processTreeIsRunning(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return !processTreeIsRunning(pid);
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

async function waitForHttpOk(url: string, timeoutMs: number, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let processError: Error | undefined;
  child.on('error', (error) => { processError = error; });

  while (Date.now() < deadline) {
    if (processError) throw new Error(`Failed to start server for ${url}: ${processError.message}`);
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Server for ${url} exited before becoming ready (code ${child.exitCode}, signal ${child.signalCode}).`);
    }

    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.ok && child.exitCode === null && child.signalCode === null && !processError) {
        return;
      }
    } catch {
      // Ignore until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for server: ${url}`);
}

async function assertPortAvailable(name: string, port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const probe = createServer();
    probe.once('error', (error) => {
      reject(new Error(`Cannot start ${name}: ${host}:${port} is unavailable (${error.message}).`));
    });
    probe.listen({ host, port }, () => {
      probe.close(() => resolve());
    });
  });
}
