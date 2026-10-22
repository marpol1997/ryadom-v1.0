/**
 * Чтение .env.local и .env для скриптов (dev, seed).
 *
 * Next.js читает эти файлы сам, а node-скрипты — нет, поэтому делаем это здесь.
 * Приоритет: переменные окружения > .env.local > .env.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadEnvFiles() {
  for (const name of ['.env.local', '.env']) {
    const file = path.join(ROOT, name);
    if (!existsSync(file)) continue;

    for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;

      const key = match[1];
      // пустая переменная окружения не считается заданной
      if (process.env[key]) continue;

      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

/** Скрывает пароль в строке подключения — для логов. */
export function maskDatabaseUrl(url) {
  return url.replace(/(:\/\/[^:@/]+:)[^@]+@/, '$1…@');
}
