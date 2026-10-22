/**
 * Проверка SQL для Supabase на настоящем движке PostgreSQL (PGlite, WASM).
 * Запуск: npm run db:verify
 *
 * Скрипт не трогает боевую базу: поднимает чистый in-memory Postgres,
 * прогоняет миграцию и сид, затем проверяет ограничения и идемпотентность.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaSql = readFileSync(path.join(ROOT, 'supabase', '0001_init.sql'), 'utf8');
const seedSql = readFileSync(path.join(ROOT, 'supabase', '0002_seed.sql'), 'utf8');

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function count(db, table) {
  const rows = await db.query(`select count(*)::int as n from ${table}`);
  return rows.rows[0].n;
}

async function expectError(promise, pattern) {
  try {
    await promise;
    return false;
  } catch (error) {
    return pattern ? pattern.test(String(error.message)) : true;
  }
}

const db = new PGlite();

console.log('\n— Миграция 0001_init.sql —');
await db.exec(schemaSql);
check('схема применяется без ошибок', true);

const tables = [
  'districts',
  'request_categories',
  'buildings',
  'users',
  'sessions',
  'building_members',
  'messages',
  'service_requests',
  'request_comments',
  'request_events',
  'specialists',
  'officers',
  'feed_items',
  'rate_limits'
];

for (const table of tables) {
  const rows = await db.query(`select to_regclass('public.${table}') as t`);
  check(`таблица ${table}`, Boolean(rows.rows[0].t));
}

const rls = await db.query(`
  select count(*)::int as n from pg_tables
  where schemaname = 'public' and rowsecurity = true
`);
check('RLS включён на всех таблицах', rls.rows[0].n === tables.length, `${rls.rows[0].n}/${tables.length}`);

console.log('\n— Демо-данные 0002_seed.sql —');
await db.exec(seedSql);
const expected = {
  buildings: 16,
  request_categories: 12,
  districts: 4,
  messages: 20,
  service_requests: 4,
  specialists: 6,
  officers: 4,
  feed_items: 4,
  users: 1
};
for (const [table, value] of Object.entries(expected)) {
  const actual = await count(db, table);
  check(`${table}: ${value}`, actual === value, `получено ${actual}`);
}

const events = await count(db, 'request_events');
check('история заявок создана', events >= 4, `событий: ${events}`);

await db.exec(seedSql);
const buildingsAfter = await count(db, 'buildings');
const messagesAfter = await count(db, 'messages');
check(
  'повторный сид не дублирует данные',
  buildingsAfter === 16 && messagesAfter === 20,
  `${buildingsAfter} домов, ${messagesAfter} сообщений`
);

console.log('\n— Ограничения и правила —');
const firstUser = await db.query(`select id, email, role from users limit 1`);
check('демо-пользователь создан с ролью admin', firstUser.rows[0]?.role === 'admin');

check(
  'e-mail уникален без учёта регистра',
  await expectError(
    db.query(
      `insert into users (name, email, password_hash) values ('Дубль', upper($1), 'x')`,
      ['anna@example.com']
    ),
    /users_email_lower_idx|duplicate key/i
  )
);

check(
  'сообщение длиннее 1500 символов отклоняется',
  await expectError(
    db.query(`insert into messages (building_id, author_name, body) select id, 'Тест', repeat('a', 1501) from buildings limit 1`),
    /check constraint|violates check/i
  )
);

check(
  'заявка без категории отклоняется',
  await expectError(
    db.query(
      `insert into service_requests (author_name, title, address) values ('Тест', 'Тестовая', 'Адрес')`
    ),
    /not-null|null value/i
  )
);

const building = await db.query(`select id from buildings where legacy_id = 'h1'`);
await db.query(`insert into building_members (building_id, user_id) select $1, id from users limit 1 on conflict do nothing`, [
  building.rows[0].id
]);
const members = await count(db, 'building_members');
check('участник добавлен в чат дома', members >= 1, `участников: ${members}`);

console.log('\n— Rate limit (переживает перезапуск инстанса) —');
const attempts = [];
for (let i = 1; i <= 4; i += 1) {
  const result = await db.query(`select * from hit_rate_limit('login:127.0.0.1', 3, make_interval(secs => 600))`);
  attempts.push(result.rows[0].allowed);
}
check('первые 3 попытки пропущены', attempts.slice(0, 3).every(Boolean));
check('4-я попытка заблокирована', attempts[3] === false);

const other = await db.query(`select * from hit_rate_limit('login:10.0.0.2', 3, make_interval(secs => 600))`);
check('другой IP не блокируется', other.rows[0].allowed === true);

console.log('\n— Заявка и смена статуса —');
const request = await db.query(`select id, status from service_requests where legacy_id = 'r1'`);
await db.query(`update service_requests set status = 'done' where id = $1`, [request.rows[0].id]);
const updated = await db.query(`select status from service_requests where id = $1`, [request.rows[0].id]);
check('статус заявки меняется', updated.rows[0].status === 'done');

const cascade = await db.query(
  `select count(*)::int as n from request_events where request_id = $1`,
  [request.rows[0].id]
);
check('история сохраняется после смены статуса', cascade.rows[0].n >= 1);

await db.close();

const failed = results.filter((item) => !item.ok);
console.log(`\nИтог: ${results.length - failed.length}/${results.length} проверок пройдено`);
if (failed.length) {
  console.error('Провалено:', failed.map((item) => item.name).join(', '));
  process.exit(1);
}
