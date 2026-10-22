/**
 * `npm run smoke:local` — поднять приложение на свободном порту и прогнать smoke.
 * Использует базу из .env, а если её нет — локальную (PGlite).
 * Скрипт создаёт тестовые записи и удаляет их после прогона.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { cleanupSmokeData } from './cleanup.mjs';
import { loadEnvFiles } from './load-env.mjs';

loadEnvFiles();

const PORT = Number(process.env.SMOKE_PORT || 3109);
const BASE = `http://127.0.0.1:${PORT}`;

const app = spawn(process.execPath, ['scripts/dev.mjs', '-p', String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let log = '';
app.stdout.on('data', (chunk) => {
  log += chunk.toString();
});
app.stderr.on('data', (chunk) => {
  log += chunk.toString();
});

async function waitReady() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return true;
    } catch {
      /* Next.js ещё компилируется */
    }
    await sleep(1000);
  }
  return false;
}

/** Убирает пользователей, созданных smoke-тестом (только при наличии DATABASE_URL). */
async function cleanup() {
  if (!process.env.DATABASE_URL) return;
  try {
    const result = await cleanupSmokeData(process.env.DATABASE_URL);
    console.log(`\n[smoke] удалено тестовых пользователей: ${result.removed}`);
  } catch (error) {
    console.warn('[smoke] уборка не удалась:', error.message, '— запустите npm run db:clean');
  }
}

let code = 1;
try {
  if (!(await waitReady())) throw new Error('сервер не поднялся');
  code = await new Promise((resolve) => {
    const smoke = spawn(process.execPath, ['scripts/smoke.mjs'], {
      env: { ...process.env, BASE_URL: BASE },
      stdio: 'inherit'
    });
    smoke.on('exit', (exitCode) => resolve(exitCode ?? 1));
  });
  await cleanup();
} catch (error) {
  console.error('[smoke] ошибка:', error.message);
} finally {
  const errors = log.split('\n').filter((line) => line.includes('[api]') || line.includes('[db]')).slice(-8);
  if (errors.length) console.log('\n--- лог сервера ---\n' + errors.join('\n'));
  app.kill('SIGTERM');
  await sleep(2500);
  try {
    process.kill(app.pid, 'SIGKILL');
  } catch {
    /* уже остановлен */
  }
  process.exit(code);
}
