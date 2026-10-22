/**
 * `npm run dev` — одна команда для локальной разработки.
 *
 * Если DATABASE_URL задан (например, Supabase) — просто запускает Next.js.
 * Если нет — поднимает локальный PostgreSQL (PGlite) на свободном порту,
 * применяет миграцию и демо-данные, и только потом стартует Next.js.
 *
 * Данные локальной базы лежат в .pglite-data/ (в .gitignore) и переживают
 * перезапуск. Удалите каталог, чтобы получить чистую базу.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadEnvFiles, maskDatabaseUrl, ROOT } from './load-env.mjs';

loadEnvFiles();

const NEXT_BIN = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
const FIRST_PORT = Number(process.env.PGLITE_PORT || 5433);

let db = null;
let dbServer = null;
let child = null;
let stopping = false;

async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (child && child.exitCode === null) {
    try {
      child.kill('SIGTERM');
    } catch {
      /* уже остановлен */
    }
  }
  await dbServer?.stop().catch(() => {});
  await db?.close().catch(() => {});
  process.exit(code);
}

process.on('SIGINT', () => void stop(0));
process.on('SIGTERM', () => void stop(0));

async function startLocalDatabase() {
  const { PGlite } = await import('@electric-sql/pglite');
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');

  db = new PGlite(path.join(ROOT, '.pglite-data'));
  await db.exec(readFileSync(path.join(ROOT, 'supabase', '0001_init.sql'), 'utf8'));
  await db.exec(readFileSync(path.join(ROOT, 'supabase', '0002_seed.sql'), 'utf8'));

  for (let port = FIRST_PORT; port < FIRST_PORT + 6; port += 1) {
    const server = new PGLiteSocketServer({ db, host: '127.0.0.1', port });
    try {
      await server.start();
      dbServer = server;
      return port;
    } catch (error) {
      if (error?.code !== 'EADDRINUSE') throw error;
    }
  }
  throw new Error(`Не удалось занять порт для локальной базы (${FIRST_PORT}–${FIRST_PORT + 5})`);
}

async function main() {
  const env = { ...process.env };
  let hint = '';

  if (!env.DATABASE_URL) {
    console.log('DATABASE_URL не задан — поднимаю локальный PostgreSQL (PGlite)…');
    const port = await startLocalDatabase();
    env.DATABASE_URL = `postgresql://postgres@127.0.0.1:${port}/postgres`;
    // PGlite обслуживает одно соединение
    env.DB_POOL_MAX = '1';
    console.log(`Локальная база: ${env.DATABASE_URL}`);
    console.log('Демо-вход: anna@example.com / more2026 (роль admin)');
    hint = 'Локальная база (PGlite). Данные в .pglite-data/, можно удалить.';
  } else {
    hint = `База: ${maskDatabaseUrl(env.DATABASE_URL)}`;
  }

  child = spawn(process.execPath, [NEXT_BIN, 'dev', ...process.argv.slice(2)], {
    cwd: ROOT,
    env,
    stdio: 'inherit'
  });

  console.log(`\n${hint}\n`);

  child.on('exit', (code) => {
    void stop(code ?? 0);
  });
}

main().catch((error) => {
  console.error('Не удалось запустить dev-сервер:', error);
  void stop(1);
});
