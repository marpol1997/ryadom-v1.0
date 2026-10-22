/**
 * Сброс лимитов входа и регистрации (rate limit хранится в БД).
 *
 *   npm run db:reset-limits
 *
 * Нужно, если при тестировании несколько раз ошиблись паролем и вход
 * заблокировался на 10 минут. Пользователей и данные не трогает.
 */
import { loadEnvFiles } from './load-env.mjs';

loadEnvFiles();
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL не задан');
  process.exit(1);
}

const { default: pg } = await import('pg');
const client = new pg.Client({
  connectionString: url,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false }
});

await client.connect();
const removed = await client.query('delete from rate_limits returning key');
const sessions = await client.query('delete from sessions where expires_at < now() returning id');
console.log(`Сброшено лимитов: ${removed.rows.length}`);
console.log(`Удалено просроченных сессий: ${sessions.rows.length}`);
await client.end();
