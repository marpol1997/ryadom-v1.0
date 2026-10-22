/**
 * Удаление тестовых данных после smoke-прогона.
 *
 *   npm run db:clean
 *
 * Трогает только то, что создают проверки: пользователей smoke-*, их заявки,
 * сообщения и сессии. Соединение с Supabase нестабильно, поэтому попытки
 * повторяются на свежем подключении.
 */
import { pathToFileURL } from 'node:url';
import { loadEnvFiles } from './load-env.mjs';

function sslFor(url) {
  return /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false };
}

export async function cleanupSmokeData(url) {
  const { default: pg } = await import('pg');

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const client = new pg.Client({
      connectionString: url,
      ssl: sslFor(url),
      connectionTimeoutMillis: 15000,
      query_timeout: 20000
    });
    try {
      await client.connect();
      const users = await client.query(
        "select id from users where email like 'smoke-%' or phone like '+7978000000%'"
      );
      const ids = users.rows.map((row) => row.id);

      if (ids.length) {
        const requests = await client.query(
          `select id from service_requests where user_id = any($1::uuid[]) or title like 'Смоук-заявка%'`,
          [ids]
        );
        await client.query('delete from service_requests where id = any($1::uuid[])', [
          requests.rows.map((row) => row.id)
        ]);
        await client.query(
          'delete from messages where user_id = any($1::uuid[]) or body like \'Смоук-сообщение%\'',
          [ids]
        );
        await client.query('delete from building_members where user_id = any($1::uuid[])', [ids]);
        await client.query('delete from sessions where user_id = any($1::uuid[])', [ids]);
        await client.query('delete from users where id = any($1::uuid[])', [ids]);
      }

      const left = await client.query(
        `select (select count(*)::int from users) as users,
                (select count(*)::int from service_requests) as requests`
      );
      return { removed: ids.length, left: left.rows[0] };
    } catch (error) {
      if (attempt === 4) throw error;
      console.warn(`[clean] попытка ${attempt} не удалась: ${error.message}`);
    } finally {
      await client.end().catch(() => {});
    }
  }
  return { removed: 0, left: null };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadEnvFiles();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL не задан');
    process.exit(1);
  }
  const result = await cleanupSmokeData(url);
  console.log(`Удалено тестовых пользователей: ${result.removed}`);
  console.log('Осталось:', result.left);
}
