/**
 * Конфигурация сервера.
 *
 * Все значения читаются из переменных окружения один раз, при старте.
 * На Vercel (serverless) файловая система доступна только на запись в /tmp,
 * поэтому DATA_DIR по умолчанию указывает туда — данные живут до перезапуска
 * инстанса. Для постоянного хранения задайте DATA_DIR на диске/volume.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function toPositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * @param {Record<string, string | undefined>} [env]
 * @returns {Readonly<{
 *   root: string, publicDir: string, seedFile: string, dataDir: string, dbFile: string,
 *   host: string, port: number, tokenTtlMs: number, maxBodyBytes: number,
 *   nodeEnv: string, isServerless: boolean, trustProxy: boolean
 * }>}
 */
export function loadConfig(env = process.env) {
  const isServerless = Boolean(env.VERCEL);
  const dataDir = env.DATA_DIR
    ? path.resolve(env.DATA_DIR)
    : isServerless
      ? '/tmp/ryadom-data'
      : path.join(ROOT, 'data');

  return Object.freeze({
    root: ROOT,
    publicDir: path.join(ROOT, 'public'),
    seedFile: path.join(ROOT, 'shared', 'seed.json'),
    dataDir,
    dbFile: path.join(dataDir, 'db.json'),
    host: env.HOST || '0.0.0.0',
    port: toPositiveInt(env.PORT, 3000),
    tokenTtlMs: 1000 * 60 * 60 * 24 * 60,
    maxBodyBytes: 1024 * 1024 * 2,
    nodeEnv: env.NODE_ENV || 'development',
    isServerless,
    trustProxy: env.TRUST_PROXY !== '0'
  });
}
