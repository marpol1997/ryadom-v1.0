/**
 * Сквозной прогон: локальный Postgres (PGlite) + Next.js + smoke-проверки API.
 *
 *   npm run e2e
 *
 * Поднимает всё сам, проверяет и гасит процессы. База — в памяти, данные
 * не покидают машину. Нужен для проверки перед деплоем и после больших правок.
 */
import { execSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_PORT = 5433;
const APP_PORT = 3100;
const BASE = `http://127.0.0.1:${APP_PORT}`;

function log(message) {
  console.log(`\n[e2e] ${message}`);
}

function killTree(pid) {
  try {
    execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
  } catch {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* уже остановлен */
    }
  }
}

const db = new PGlite();
await db.exec(readFileSync(path.join(ROOT, 'supabase', '0001_init.sql'), 'utf8'));
await db.exec(readFileSync(path.join(ROOT, 'supabase', '0002_seed.sql'), 'utf8'));

const server = new PGLiteSocketServer({ db, host: '127.0.0.1', port: DB_PORT });
await server.start();
log(`Postgres (PGlite) на порту ${DB_PORT}`);

const nextBin = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
const app = spawn(process.execPath, [nextBin, 'dev', '-p', String(APP_PORT)], {
  cwd: ROOT,
  env: {
    ...process.env,
    DATABASE_URL: `postgresql://postgres@127.0.0.1:${DB_PORT}/postgres`,
    NEXT_PUBLIC_APP_URL: BASE,
    NODE_ENV: 'development',
    DB_POOL_MAX: '1'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let appLog = '';
app.stdout.on('data', (chunk) => {
  appLog += chunk.toString();
});
app.stderr.on('data', (chunk) => {
  appLog += chunk.toString();
});

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return true;
    } catch {
      /* ещё компилируется */
    }
    await sleep(1000);
  }
  return false;
}

let exitCode = 1;
let shuttingDown = false;

async function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  log('останавливаю процессы');
  killTree(app.pid);
  await server.stop().catch(() => {});
  await db.close().catch(() => {});
  process.exit(code);
}

process.on('SIGINT', () => void shutdown(1));
process.on('SIGTERM', () => void shutdown(1));

try {
  log('запускаю Next.js, первый запуск может занять до минуты');
  const ready = await waitForServer();
  if (!ready) {
    console.error('[e2e] сервер не поднялся. Лог Next.js:\n', appLog.slice(-3000));
    exitCode = 1;
  } else {
    log('сервер готов, запускаю smoke');
    exitCode = await new Promise((resolve) => {
      const smoke = spawn(process.execPath, ['scripts/smoke.mjs'], {
        cwd: ROOT,
        env: { ...process.env, BASE_URL: BASE },
        stdio: 'inherit'
      });
      smoke.on('exit', (code) => resolve(code ?? 1));
    });
  }
} catch (error) {
  console.error('[e2e] ошибка:', error);
  exitCode = 1;
} finally {
  if (appLog.includes('Error')) {
    const lines = appLog.split('\n').filter((line) => /Error|error/i.test(line)).slice(-10);
    if (lines.length) console.error('\n[e2e] ошибки из лога Next.js:\n' + lines.join('\n'));
  }
  await shutdown(exitCode);
}
