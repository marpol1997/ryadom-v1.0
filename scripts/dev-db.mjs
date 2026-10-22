/**
 * Локальный Postgres без установки: PGlite + сервер по протоколу Postgres.
 * Нужен, чтобы запустить приложение до создания проекта в Supabase.
 *
 *   npm run db:local
 *   # в другом терминале:
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:5433/postgres npm run dev
 *
 * База живёт в памяти процесса: при перезапуске создаётся заново из миграции и сида.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PGLITE_PORT || 5433);

console.log('Поднимаю локальный Postgres (PGlite)…');

const db = new PGlite();
await db.exec(readFileSync(path.join(ROOT, 'supabase', '0001_init.sql'), 'utf8'));
await db.exec(readFileSync(path.join(ROOT, 'supabase', '0002_seed.sql'), 'utf8'));

const server = new PGLiteSocketServer({ db, host: '127.0.0.1', port: PORT });
await server.start();

console.log(`Готово. DATABASE_URL=postgresql://postgres@127.0.0.1:${PORT}/postgres`);
console.log('Демо-вход: anna@example.com / more2026 (роль admin)');

async function shutdown() {
  console.log('\nОстанавливаю…');
  await server.stop();
  await db.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
