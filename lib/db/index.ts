/**
 * Подключение к Postgres.
 *
 * Драйвер — node-postgres (`pg`), а не postgres.js: с Supabase pooler
 * (Supavisor) postgres.js рвёт соединение после 2–4 запросов на одном сокете
 * (ECONNRESET / зависание), тогда как `pg` работает стабильно.
 *
 * Пулер Supabase закрывает простаивающие соединения. Чтобы не получить
 * «мёртвый» сокет из пула, мы закрываем простаивающие клиенты раньше него
 * (idleTimeoutMillis), держим TCP keep-alive и один раз переподключаемся,
 * если запрос всё-таки упал по сети.
 *
 * Ленивое подключение: модуль можно импортировать при сборке без DATABASE_URL.
 */
import { sql as sqlTag, type SQL } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { requireDatabaseUrl } from '../env';
import * as schema from './schema';

type Db = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __ryadomDb?: Db;
  __ryadomPool?: Pool;
};

function poolSize(): number {
  const value = Number(process.env.DB_POOL_MAX ?? 0);
  if (Number.isFinite(value) && value > 0) return value;
  return process.env.NODE_ENV === 'production' ? 5 : 3;
}

/** Сбрасывает пул: мёртвые сокеты (Supavisor, serverless freeze) не переиспользуем. */
async function resetPool(): Promise<void> {
  const pool = globalForDb.__ryadomPool;
  globalForDb.__ryadomPool = undefined;
  globalForDb.__ryadomDb = undefined;
  if (!pool) return;
  await Promise.race([pool.end().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 2000))]);
}

/** Ошибки, после которых имеет смысл один раз переподключиться. */
function isTransient(error: unknown): boolean {
  const code = (error as { code?: string }).code ?? '';
  const message = error instanceof Error ? error.message : '';
  if (
    [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EPIPE',
      'ENOENT',
      'EAI_AGAIN',
      'EHOSTUNREACH',
      '57P01',
      '57P02',
      '08006',
      '08003'
    ].includes(code)
  ) {
    return true;
  }
  return /timeout|connection terminated|connection closed|socket hang up|cannot use a closed/i.test(message);
}

export function getPool(): Pool {
  if (!globalForDb.__ryadomPool) {
    const url = requireDatabaseUrl();
    const pool = new Pool({
      connectionString: url,
      max: poolSize(),
      // закрываем простаивающие соединения раньше, чем это сделает пулер Supabase
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 15_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5_000,
      application_name: 'ryadom',
      // зависший запрос должен падать ошибкой, а не висеть вечно
      query_timeout: Number(process.env.DB_QUERY_TIMEOUT ?? 15_000),
      statement_timeout: Number(process.env.DB_QUERY_TIMEOUT ?? 15_000),
      // Supabase/Timeweb отдают сертификаты от публичных CA, но pooler иногда
      // представляется не тем хостом — проверку цепочки отключаем, TLS оставляем.
      ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false }
    });
    // без обработчика ошибка простаивающего клиента убивает процесс
    pool.on('error', (error) => console.error('[db] ошибка простаивающего соединения:', error.message));
    globalForDb.__ryadomPool = pool;
  }
  return globalForDb.__ryadomPool;
}

export function getDb(): Db {
  if (!globalForDb.__ryadomDb) {
    globalForDb.__ryadomDb = drizzle(getPool(), { schema });
  }
  return globalForDb.__ryadomDb;
}

/**
 * Любая работа с БД с одним повтором на свежем пуле.
 * Нужно из-за нестабильного канала до Supabase: пулер закрывает сокеты,
 * и первая попытка может прийтись на уже мёртвое соединение.
 */
export async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await fn(getDb());
    if (process.env.DB_DEBUG) console.log(`[db] ok ${Date.now() - startedAt} мс`);
    return result;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (typeof status === 'number') throw error; // ApiError — это не сбой базы

    console.error(`[db] ошибка за ${Date.now() - startedAt} мс:`, (error as Error).message);
    if (!isTransient(error)) throw error;

    console.warn('[db] переподключаюсь и повторяю запрос');
    await resetPool();
    const result = await fn(getDb());
    if (process.env.DB_DEBUG) console.log(`[db] повтор ok ${Date.now() - startedAt} мс`);
    return result;
  }
}

/**
 * Сырой SQL → массив строк.
 * У node-postgres `execute` возвращает QueryResult — прячем разницу от драйвера.
 */
export async function query<T extends Record<string, unknown>>(statement: SQL): Promise<T[]> {
  return withDb(async (db) => {
    const result = await db.execute<T>(statement);
    return result.rows as unknown as T[];
  });
}

export { sqlTag as sql };
export * as t from './schema';
export { schema };
