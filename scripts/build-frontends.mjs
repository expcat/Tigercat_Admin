import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGES = {
  react: 'tigercat-admin-react',
  vue: 'tigercat-admin-vue',
};

const args = parseArgs(process.argv.slice(2));
const deployMode = args.deploy ?? 'separate';
if (!['separate', 'pages'].includes(deployMode)) {
  fail("Invalid --deploy value. Use 'separate' or 'pages'.");
}

const dataSource = args.data ?? (deployMode === 'pages' ? 'mock' : 'api');
const target = args.target ?? 'all';

if (!['api', 'mock'].includes(dataSource)) {
  fail("Invalid --data value. Use 'api' or 'mock'.");
}

if (deployMode === 'pages' && dataSource !== 'mock') {
  fail("The pages deployment mode uses static mock data. Use --data=mock or omit --data.");
}

if (!['all', 'react', 'vue'].includes(target)) {
  fail("Invalid --target value. Use 'all', 'react', or 'vue'.");
}

if (deployMode === 'pages' && target !== 'all') {
  fail("The pages deployment mode requires --target=all.");
}

const routerMode = args.router ?? (dataSource === 'mock' ? 'hash' : 'history');
if (!['hash', 'history'].includes(routerMode)) {
  fail("Invalid --router value. Use 'hash' or 'history'.");
}

const basePath = args.base ?? (deployMode === 'pages' ? './' : '/');
const routerBase = args['router-base'] ?? (basePath.startsWith('.') ? '' : basePath);
const packageNames =
  target === 'all' ? [PACKAGES.react, PACKAGES.vue] : [PACKAGES[target]];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagesOutDir = path.resolve(repoRoot, args.out ?? 'dist/pages');

const env = {
  ...process.env,
  VITE_TIGERCAT_DEMO: dataSource === 'mock' ? 'true' : 'false',
  VITE_TIGERCAT_ROUTER_MODE: routerMode,
  VITE_TIGERCAT_BASE_PATH: basePath,
  VITE_TIGERCAT_ROUTER_BASE: routerBase,
};

if (args['api-url']) {
  env.VITE_API_URL = args['api-url'];
}

console.log(
  [
    `Frontend build: data=${dataSource}`,
    `router=${routerMode}`,
    `base=${basePath}`,
    routerBase ? `routerBase=${routerBase}` : null,
    `target=${target}`,
    `deploy=${deployMode}`,
    deployMode === 'pages' ? `out=${pagesOutDir}` : null,
    args['api-url'] ? `apiUrl=${args['api-url']}` : null,
  ]
    .filter(Boolean)
    .join(' '),
);

if (deployMode === 'pages') {
  await buildPagesBundle(env, pagesOutDir);
} else {
  for (const packageName of packageNames) {
    await runPnpm(['--filter', packageName, 'exec', 'vite', 'build'], env);
  }
}

async function buildPagesBundle(env, outDir) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  await runPnpm(
    ['--filter', PACKAGES.react, 'exec', 'vite', 'build'],
    { ...env, VITE_TIGERCAT_OUT_DIR: path.join(outDir, 'react') },
  );
  await runPnpm(
    ['--filter', PACKAGES.vue, 'exec', 'vite', 'build'],
    { ...env, VITE_TIGERCAT_OUT_DIR: path.join(outDir, 'vue') },
  );

  await writeFile(path.join(outDir, 'index.html'), createPagesIndex(), 'utf8');
  await writeFile(path.join(outDir, '404.html'), createPagesNotFound(), 'utf8');
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith('--')) continue;

    const normalized = value.slice(2);
    const [key, inlineValue] = normalized.split('=', 2);
    if (inlineValue !== undefined) {
      result[key] = inlineValue;
      continue;
    }

    const next = values[index + 1];
    if (next && !next.startsWith('--')) {
      result[key] = next;
      index += 1;
    } else {
      result[key] = 'true';
    }
  }
  return result;
}

function runPnpm(commandArgs, env) {
  const command =
    process.platform === 'win32' ? 'cmd.exe' : 'pnpm';
  const args =
    process.platform === 'win32'
      ? ['/d', '/s', '/c', 'pnpm', ...commandArgs]
      : commandArgs;
  return run(command, args, env);
}

function run(command, commandArgs, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      env,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${commandArgs.join(' ')} exited with ${code}`));
      }
    });
    child.on('error', reject);
  });
}

function createPagesIndex() {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tigercat Admin Static Demo</title>
    <style>
      body { margin: 0; font-family: Arial, "Microsoft YaHei", sans-serif; background: #f8fafc; color: #0f172a; }
      main { min-height: 100vh; display: grid; place-items: center; padding: 32px; box-sizing: border-box; }
      section { width: min(760px, 100%); }
      h1 { margin: 0 0 8px; font-size: 32px; letter-spacing: 0; }
      p { margin: 0 0 24px; color: #475569; line-height: 1.7; }
      .links { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
      a { display: block; border: 1px solid #cbd5e1; border-radius: 8px; background: white; padding: 20px; color: #1d4ed8; text-decoration: none; font-weight: 700; }
      a span { display: block; margin-top: 8px; color: #64748b; font-size: 14px; font-weight: 400; }
      a:hover { border-color: #2563eb; box-shadow: 0 12px 28px rgba(37, 99, 235, 0.12); }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>Tigercat Admin 静态演示</h1>
        <p>React 与 Vue 演示应用部署在同一个 Pages 根目录下，均使用前端静态 Mock 数据与 hash 路由。</p>
        <div class="links">
          <a href="./react/#/login">打开 React 演示<span>路径：/react/#/login</span></a>
          <a href="./vue/#/login">打开 Vue 演示<span>路径：/vue/#/login</span></a>
        </div>
      </section>
    </main>
  </body>
</html>
`;
}

function createPagesNotFound() {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tigercat Admin Static Demo</title>
    <meta http-equiv="refresh" content="0; url=./" />
  </head>
  <body>
    <a href="./">返回 Tigercat Admin 静态演示入口</a>
  </body>
</html>
`;
}


function fail(message) {
  console.error(message);
  process.exit(1);
}
